(() => {
  const PROJECT_PACKAGE_FORMAT = 'releve-chantier-package';
  const PROJECT_PACKAGE_VERSION = 1;

  function bytesFromBlob(blob) {
    return blob.arrayBuffer().then(buffer => new Uint8Array(buffer));
  }

  function storedZip(entries, filename) {
    const encoder = new TextEncoder();
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    let centralSize = 0;

    entries.forEach(entry => {
      const name = encoder.encode(entry.name);
      const data = entry.data;
      const crc = zipCrc32(data);
      const local = [];
      zipPush32(local, 0x04034b50);
      zipPush16(local, 20);
      zipPush16(local, 0x0800);
      zipPush16(local, 0);
      zipPush16(local, dosTime);
      zipPush16(local, dosDate);
      zipPush32(local, crc);
      zipPush32(local, data.length);
      zipPush32(local, data.length);
      zipPush16(local, name.length);
      zipPush16(local, 0);
      const localBytes = new Uint8Array(local);
      localParts.push(localBytes, name, data);

      const central = [];
      zipPush32(central, 0x02014b50);
      zipPush16(central, 20);
      zipPush16(central, 20);
      zipPush16(central, 0x0800);
      zipPush16(central, 0);
      zipPush16(central, dosTime);
      zipPush16(central, dosDate);
      zipPush32(central, crc);
      zipPush32(central, data.length);
      zipPush32(central, data.length);
      zipPush16(central, name.length);
      zipPush16(central, 0);
      zipPush16(central, 0);
      zipPush16(central, 0);
      zipPush16(central, 0);
      zipPush32(central, 0);
      zipPush32(central, offset);
      const centralBytes = new Uint8Array(central);
      centralParts.push(centralBytes, name);
      centralSize += centralBytes.length + name.length;
      offset += localBytes.length + name.length + data.length;
    });

    const end = [];
    zipPush32(end, 0x06054b50);
    zipPush16(end, 0);
    zipPush16(end, 0);
    zipPush16(end, entries.length);
    zipPush16(end, entries.length);
    zipPush32(end, centralSize);
    zipPush32(end, offset);
    zipPush16(end, 0);
    return new File([...localParts, ...centralParts, new Uint8Array(end)], filename, { type: 'application/zip' });
  }

  async function jpegEntry(source, name) {
    const mime = String(source).slice(5, String(source).indexOf(';')).toLowerCase();
    if (mime === 'image/jpeg' || mime === 'image/jpg') return { name, data: dataUrlBytes(source) };
    try {
      const image = await preparePdfImage(source, 2000, .9);
      return { name, data: dataUrlBytes(image.data) };
    } catch (error) {
      console.warn('Photo conservée dans son format d’origine', error);
      return { name: name.replace(/\.jpg$/, '.' + photoExtension(source)), data: dataUrlBytes(source) };
    }
  }

  async function projectPackageFile() {
    const projects = await allProjects();
    const project = projects.find(item => item.id === currentId);
    if (!project) throw new Error("le relevé courant n'a pas été retrouvé");

    const exportedAt = new Date().toISOString();
    const backup = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt,
      package: { format: PROJECT_PACKAGE_FORMAT, version: PROJECT_PACKAGE_VERSION },
      projects: [project]
    };
    const pdf = await createProjectPdfFile();
    const entries = [
      { name: 'projet-modifiable.json', data: new TextEncoder().encode(JSON.stringify(backup)) },
      { name: 'rapport/' + pdf.name, data: await bytesFromBlob(pdf) }
    ];

    for (let index = 0; index < (project.photos || []).length; index++) {
      entries.push(await jpegEntry(project.photos[index], 'photos/photos-generales/photo-' + String(index + 1).padStart(3, '0') + '.jpg'));
    }

    const projectPages = normalizePages(project);
    for (let pageIndex = 0; pageIndex < projectPages.length; pageIndex++) {
      const page = projectPages[pageIndex];
      for (let workIndex = 0; workIndex < (page.works || []).length; workIndex++) {
        const work = page.works[workIndex];
        const prefix = 'photos/page-' + String(pageIndex + 1).padStart(2, '0') + '-' + archivePart(shown(page.type, page.other), 'ouvrage') + '/ouvrage-' + String(workIndex + 1).padStart(2, '0') + '/';
        for (let photoIndex = 0; photoIndex < (work.photos || []).length; photoIndex++) {
          entries.push(await jpegEntry(work.photos[photoIndex], prefix + 'photo-' + String(photoIndex + 1).padStart(3, '0') + '.jpg'));
        }
        for (let attachmentIndex = 0; attachmentIndex < (work.attachments || []).length; attachmentIndex++) {
          const attachment = work.attachments[attachmentIndex];
          if (!attachment?.data) continue;
          const safeName = String(attachment.name || 'piece-jointe-' + (attachmentIndex + 1) + '.pdf').replace(/[\\/:*?"<>|]+/g, '-');
          entries.push({ name: 'pieces-jointes/page-' + String(pageIndex + 1).padStart(2, '0') + '/ouvrage-' + String(workIndex + 1).padStart(2, '0') + '/' + safeName, data: dataUrlBytes(attachment.data) });
        }
      }
    }

    const base = archivePart(project.projectTitle || project.contactName, 'chantier');
    const filename = 'dossier-' + base + '-' + exportedAt.slice(0, 10) + '.zip';
    return { project, file: storedZip(entries, filename), label: 'dossier complet avec PDF, photos JPEG et fichier modifiable' };
  }

  function read32(view, offset) {
    return view.getUint32(offset, true);
  }

  function read16(view, offset) {
    return view.getUint16(offset, true);
  }

  async function backupFromPackage(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const decoder = new TextDecoder();
    let offset = 0;
    while (offset + 30 <= bytes.length && read32(view, offset) === 0x04034b50) {
      const flags = read16(view, offset + 6);
      const method = read16(view, offset + 8);
      const compressedSize = read32(view, offset + 18);
      const nameLength = read16(view, offset + 26);
      const extraLength = read16(view, offset + 28);
      const nameStart = offset + 30;
      const dataStart = nameStart + nameLength + extraLength;
      const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
      if (flags & 0x0008) throw new Error('Ce dossier ZIP utilise un format non pris en charge.');
      if (name === 'projet-modifiable.json') {
        if (method !== 0) throw new Error('La sauvegarde du dossier ZIP est compressée dans un format non pris en charge.');
        return new File([bytes.subarray(dataStart, dataStart + compressedSize)], 'projet-modifiable.json', { type: 'application/json' });
      }
      offset = dataStart + compressedSize;
    }
    throw new Error('Ce ZIP ne contient pas de projet modifiable Relevé Chantier.');
  }

  async function importProjectFile(file) {
    if (/\.zip$/i.test(file.name) || file.type === 'application/zip') {
      setBackupStatus('Ouverture du dossier projet…');
      return importBackupFile(await backupFromPackage(file));
    }
    return importBackupFile(file);
  }

  async function shareProjectPackage(destination) {
    $('projectsSection').open = true;
    if (destination === 'kdrive' && !navigator.onLine) {
      setBackupStatus('Hors connexion : le chantier reste enregistré dans l’iPad. Enregistrez le dossier sur l’iPad, puis envoyez-le vers kDrive lorsque le réseau revient.', true);
      return false;
    }
    const { file, label } = await projectPackageFile();
    const files = [file];
    const local = destination === 'local';
    setBackupStatus(local ? 'Choisissez « Enregistrer dans Fichiers », puis votre dossier de chantier.' : 'Choisissez kDrive, puis le dossier de destination.');
    if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
      try {
        await navigator.share({ files });
        setBackupStatus(label + (local ? ' remis à Fichiers.' : ' remis à kDrive. Vérifiez la fin du transfert.'));
        return true;
      } catch (error) {
        if (error?.name === 'AbortError') {
          setBackupStatus(local ? 'Enregistrement annulé. Le chantier reste dans l’application.' : 'Envoi annulé. Le chantier reste dans l’iPad.');
          return false;
        }
        throw error;
      }
    }
    downloadBackupFile(file);
    setBackupStatus(label + ' téléchargé sur l’appareil.');
    return true;
  }

  async function saveCompletePackage(destination) {
    if (!await prepareProjectCopy()) return false;
    try {
      return await shareProjectPackage(destination);
    } catch (error) {
      console.error('Échec de la création du dossier projet', error);
      setBackupStatus('Le chantier reste enregistré dans l’application, mais le dossier complet n’a pas pu être créé : ' + (error.message || 'erreur inconnue'), true);
      return false;
    }
  }

  const picker = $('backupFile');
  picker.accept = 'application/json,.json,application/zip,.zip';
  picker.onchange = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await importProjectFile(file);
  };
  document.querySelector('label[for="backupFile"]').textContent = 'Ouvrir un dossier de chantier';
  const format = $('exportFormat');
  format.innerHTML = '<option value="package">Dossier complet (.zip)</option>';
  format.setAttribute('aria-label', 'Dossier complet à créer');
  $('saveProject').onclick = () => saveCompletePackage('local');
  $('exportBackup').onclick = () => saveCompletePackage('kdrive');
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async launchParams => {
      const handle = launchParams.files?.[0];
      if (!handle) return;
      try {
        await importProjectFile(await handle.getFile());
      } catch (error) {
        console.error("Échec de l'ouverture directe", error);
        $('projectsSection').open = true;
        setBackupStatus("Le dossier n’a pas pu être ouvert : " + (error.message || 'erreur inconnue'), true);
      }
    });
  }
})();
