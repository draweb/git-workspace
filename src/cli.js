'use strict';

const { spawn } = require('child_process');
const path = require('path');
const { EXIT_CODES } = require('./constants');

const { program } = require('commander');

function runGit(args, cwd) {
  return new Promise((resolve) => {
    const child = spawn('git', args, {
      stdio: 'inherit',
      cwd: cwd || process.cwd()
    });
    child.on('close', (code, signal) => {
      if (code !== null) resolve(code);
      else resolve(signal ? 128 : 0);
    });
    child.on('error', (err) => {
      console.error('gw: error al ejecutar git:', err.message);
      resolve(EXIT_CODES.ENV);
    });
  });
}

function parseCloneWithWorkspace(argv) {
  if (argv[0] !== 'clone') return null;
  const idxW = argv.indexOf('-w');
  const idxWLong = argv.indexOf('--workspace');
  let wsName = null;
  if (idxW !== -1 && argv[idxW + 1]) wsName = argv[idxW + 1];
  else if (idxWLong !== -1 && argv[idxWLong + 1]) wsName = argv[idxWLong + 1];
  if (!wsName) return null;
  const skip = new Set(['clone', '-w', '--workspace', wsName]);
  let url = null;
  let urlIdx = -1;
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (skip.has(a)) continue;
    if (a.startsWith('-')) continue;
    if ((a.includes('@') && a.includes(':')) || a.startsWith('ssh://')) {
      url = a;
      urlIdx = i;
      break;
    }
  }
  if (!url || urlIdx === -1) return null;
  const extraArgs = argv.slice(urlIdx + 1);
  return { workspace: wsName, url, extraArgs };
}

function parseRemoteAdd(argv) {
  if (argv[0] !== 'remote' || argv[1] !== 'add') return null;
  const idxW = argv.indexOf('-w');
  const idxWLong = argv.indexOf('--workspace');
  let ws = null;
  if (idxW !== -1 && argv[idxW + 1]) ws = argv[idxW + 1];
  else if (idxWLong !== -1 && argv[idxWLong + 1]) ws = argv[idxWLong + 1];
  if (!ws) return null;
  const name = argv[2];
  if (!name || name.startsWith('-')) return null;
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('-')) continue;
    if ((a.includes('@') && a.includes(':')) || a.startsWith('ssh://')) {
      return { remoteName: name, workspace: ws, url: a };
    }
  }
  return null;
}

function parseRemoteSetUrl(argv) {
  if (argv[0] !== 'remote' || argv[1] !== 'set-url') return null;
  const idxW = argv.indexOf('-w');
  const idxWLong = argv.indexOf('--workspace');
  let ws = null;
  if (idxW !== -1 && argv[idxW + 1]) ws = argv[idxW + 1];
  else if (idxWLong !== -1 && argv[idxWLong + 1]) ws = argv[idxWLong + 1];
  if (!ws) return null;
  const name = argv[2];
  if (!name || name.startsWith('-')) return null;
  const skip = new Set(['remote', 'set-url', name, '-w', '--workspace', ws]);
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (skip.has(a)) continue;
    if (a.startsWith('-')) continue;
    if ((a.includes('@') && a.includes(':')) || a.startsWith('ssh://')) {
      return { remoteName: name, workspace: ws, url: a };
    }
  }
  return null;
}

function main() {
  const pkg = require(path.join(__dirname, '..', 'package.json'));
  const argv = process.argv.slice(2);

  if (argv[0] === '--version' || argv[0] === '-V') {
    console.log(pkg.version);
    process.exit(EXIT_CODES.SUCCESS);
  }

  if (argv[0] === '--help' || argv[0] === '-h' || argv.length === 0) {
    program
      .name('gw')
      .description('Git Workspace CLI. Comandos propios: workspace, clone -w, remote -w, push/pull/fetch, init -w, repo link, doctor. El resto se reenvía a git.')
      .version(pkg.version, '-V, --version')
      .helpOption('-h, --help')
      .addHelpText('after', '\nEjemplos:\n  gw workspace list\n  gw clone -w draweb git@github.com:user/repo.git\n  gw remote add origin -w draweb git@github.com:user/repo.git');
    program.parse(process.argv);
    if (argv.length === 0) program.outputHelp();
    process.exit(EXIT_CODES.SUCCESS);
  }

  const cloneParsed = parseCloneWithWorkspace(argv);
  if (cloneParsed) {
    const dryRun = argv.includes('--dry-run');
    const cloneCmd = require('./commands/clone');
    cloneCmd.run(cloneParsed.workspace, cloneParsed.url, cloneParsed.extraArgs, { runGit, dryRun }).then(code => process.exit(code));
    return;
  }

  if (argv[0] === 'workspace') {
    program.name('gw').version(pkg.version);
    const workspaceCmd = program.command('workspace').description('Gestionar workspaces (add, list, remove, show, current, edit)');
    workspaceCmd
      .command('add <nombre>')
      .description('Añadir un workspace (pide name, email y clave SSH)')
      .option('--name <string>', 'Nombre para git config')
      .option('--email <string>', 'Email para git config')
      .option('--identity-file <path>', 'Ruta a clave SSH existente')
      .option('--new-key', 'Generar nueva clave SSH')
      .addHelpText('after', '\nEjemplos:\n  gw workspace add draweb\n  gw workspace add myws --name "Me" --email me@x.com --new-key')
      .action(async (nombre, opts) => {
        const workspaceAdd = require('./commands/workspace-add');
        const runSshKeygen = (args) => new Promise((resolve) => {
          const c = require('child_process').spawn('ssh-keygen', args, { stdio: 'inherit' });
          c.on('close', (code) => resolve(code !== null ? code : 0));
          c.on('error', (e) => { console.error('gw:', e.message); resolve(EXIT_CODES.EXTERNAL); });
        });
        const code = await workspaceAdd.run(nombre, opts, { runSshKeygen });
        process.exit(code);
      });
    workspaceCmd
      .command('list')
      .description('Listar workspaces configurados')
      .action(() => {
        process.exit(require('./commands/workspace-list').run());
      });
    workspaceCmd
      .command('remove <nombre>')
      .description('Eliminar un workspace de la config')
      .option('--clean-ssh', 'Quitar hosts de ~/.ssh/config asociados al workspace')
      .addHelpText('after', '\nEjemplo: gw workspace remove draweb --clean-ssh')
      .action((nombre, opts) => {
        process.exit(require('./commands/workspace-remove').run(nombre, opts));
      });
    workspaceCmd
      .command('show <nombre>')
      .description('Mostrar detalle de un workspace')
      .action((nombre) => {
        process.exit(require('./commands/workspace-show').run(nombre));
      });
    workspaceCmd
      .command('current')
      .description('Mostrar el workspace asociado al repo actual')
      .action(() => {
        process.exit(require('./commands/workspace-current').run());
      });
    workspaceCmd
      .command('edit <nombre>')
      .description('Editar name, email o identityFile de un workspace')
      .option('--name <string>', 'Nuevo nombre para git config')
      .option('--email <string>', 'Nuevo email')
      .option('--identity-file <path>', 'Nueva ruta a clave SSH')
      .action((nombre, opts) => {
        process.exit(require('./commands/workspace-edit').run(nombre, opts));
      });
    program.parse(process.argv);
    if (argv.length === 1 || argv[1] === '--help' || argv[1] === '-h') {
      workspaceCmd.outputHelp();
      process.exit(EXIT_CODES.USAGE);
    }
    return;
  }

  if (argv[0] === 'remote') {
    if (argv[1] === '-v' || argv[1] === 'list') {
      process.exit(require('./commands/remote-list').run());
      return;
    }
    const addParsed = parseRemoteAdd(argv);
    if (addParsed) {
      require('./commands/remote-add').run(addParsed.remoteName, addParsed.workspace, addParsed.url, { runGit }).then(code => process.exit(code));
      return;
    }
    const setUrlParsed = parseRemoteSetUrl(argv);
    if (setUrlParsed) {
      require('./commands/remote-set-url').run(setUrlParsed.remoteName, setUrlParsed.workspace, setUrlParsed.url, {}).then(code => process.exit(code));
      return;
    }
  }

  if (argv[0] === 'init') {
    const idxW = argv.indexOf('-w');
    const idxWLong = argv.indexOf('--workspace');
    let ws = null;
    if (idxW !== -1 && argv[idxW + 1]) ws = argv[idxW + 1];
    else if (idxWLong !== -1 && argv[idxWLong + 1]) ws = argv[idxWLong + 1];
    if (ws) {
      const extra = [];
      for (let i = 1; i < argv.length; i++) {
        if (argv[i] === '-w' || argv[i] === '--workspace') { i++; continue; }
        if (argv[i] === ws) continue;
        extra.push(argv[i]);
      }
      require('./commands/init').run(ws, extra, { runGit }).then(code => process.exit(code));
      return;
    }
  }

  if (argv[0] === 'repo' && argv[1] === 'link') {
    const idxW = argv.indexOf('-w');
    const idxWLong = argv.indexOf('--workspace');
    let ws = null;
    if (idxW !== -1 && argv[idxW + 1]) ws = argv[idxW + 1];
    else if (idxWLong !== -1 && argv[idxWLong + 1]) ws = argv[idxWLong + 1];
    if (ws) {
      require('./commands/repo-link').run(ws, {}).then(code => process.exit(code));
      return;
    }
  }

  if (argv[0] === 'doctor' || argv[0] === 'check') {
    process.exit(require('./commands/doctor').run());
    return;
  }

  if (argv[0] === 'push') {
    require('./commands/push').run(argv.slice(1), { runGit }).then((code) => {
      if (code !== null) process.exit(code);
      else runGit(argv).then(c => process.exit(c));
    });
    return;
  }
  if (argv[0] === 'pull') {
    require('./commands/pull').run(argv.slice(1), { runGit }).then((code) => {
      if (code !== null) process.exit(code);
      else runGit(argv).then(c => process.exit(c));
    });
    return;
  }
  if (argv[0] === 'fetch') {
    require('./commands/fetch').run(argv.slice(1), { runGit }).then((code) => {
      if (code !== null) process.exit(code);
      else runGit(argv).then(c => process.exit(c));
    });
    return;
  }

  runGit(argv).then(code => process.exit(code));
}

try {
  main();
} catch (err) {
  console.error('gw:', err.message);
  process.exit(EXIT_CODES.ENV);
}
