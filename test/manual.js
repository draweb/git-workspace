#!/usr/bin/env node
'use strict';

/**
 * Script de prueba manual para gw.
 * Ejecutar desde la raíz del repo: node test/manual.js
 * No modifica ~/.ssh/config ni ~/.gw si no se indica.
 */

const path = require('path');
const fs = require('fs');

const gwRoot = path.join(__dirname, '..');
const config = require(path.join(gwRoot, 'src/config.js'));
const urlUtils = require(path.join(gwRoot, 'src/url-utils.js'));
const constants = require(path.join(gwRoot, 'src/constants.js'));

console.log('=== Pruebas manuales gw ===\n');

// 1. Constantes
console.log('1. Constantes');
console.log('   CONFIG_DIR:', constants.CONFIG_DIR);
console.log('   GW_CONFIG_PATH:', constants.GW_CONFIG_PATH);
console.log('');

// 2. Parse URL SSH
console.log('2. Parse URL SSH');
const urls = [
  'git@github.com:user/repo.git',
  'ssh://git@github.com/user/repo.git',
  'git@gitlab.com:group/project.git'
];
for (const u of urls) {
  const p = urlUtils.parseSshUrl(u);
  console.log('   ', u, '->', p ? p.host : null);
}
console.log('');

// 3. buildAliasedUrl
console.log('3. buildAliasedUrl(draweb)');
const u = 'git@github.com:user/repo.git';
const aliased = urlUtils.buildAliasedUrl(u, 'draweb.github.com');
console.log('   ', u);
console.log('   ->', aliased);
console.log('');

// 4. Config (solo lectura si existe)
console.log('4. Config gw (lectura)');
try {
  const workspaces = config.getWorkspaces();
  console.log('   Workspaces:', Object.keys(workspaces).length);
  for (const [name, ws] of Object.entries(workspaces)) {
    console.log('   -', name, ':', ws.email);
  }
} catch (e) {
  console.log('   (no config o error)', e.message);
}
console.log('');

// 5. Validación nombre workspace
console.log('5. Validación nombre workspace');
const { validateWorkspaceName } = require(path.join(gwRoot, 'src/utils/validate.js'));
console.log('   "draweb" ->', validateWorkspaceName('draweb').valid);
console.log('   "" ->', validateWorkspaceName('').valid);
console.log('   "a b" ->', validateWorkspaceName('a b').valid);
console.log('');

console.log('=== Fin pruebas manuales ===');
