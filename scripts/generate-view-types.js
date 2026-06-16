const fs = require('node:fs');
const path = require('node:path');

const dataModelsRoot = path.resolve(__dirname, '..', 'src', 'data-models');
const barrelPath = path.join(dataModelsRoot, 'view-types.ts');

const TYPE_BY_MODEL_FIELD = {
  number: 'number',
  string: 'string',
  datetime: 'string',
};

const getInterfaceName = (tableName) =>
  `VIEW_${tableName.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`;

const toPropertyLine = (fieldName, fieldType) => {
  const propertyName = /^[A-Za-z_][A-Za-z0-9_]*$/.test(fieldName)
    ? fieldName
    : JSON.stringify(fieldName);
  return `  ${propertyName}: ${fieldType};`;
};

const generateTypeFile = (tableName, viewPath, typePath) => {
  if (fs.existsSync(typePath)) {
    return;
  }

  const view = JSON.parse(fs.readFileSync(viewPath, 'utf8'));
  const lines = [`export interface ${getInterfaceName(tableName)} {`];

  for (const [fieldName, metadata] of Object.entries(view)) {
    const fieldType = TYPE_BY_MODEL_FIELD[metadata.type];
    if (fieldType == null) {
      throw new Error(
        `Unsupported type '${metadata.type}' in ${path.relative(dataModelsRoot, viewPath)} for field ${fieldName}`,
      );
    }
    lines.push(toPropertyLine(fieldName, fieldType));
  }

  lines.push('}');
  lines.push('');
  fs.writeFileSync(typePath, `${lines.join('\n')}`, 'utf8');
};

const exportLines = [];
for (const entry of fs.readdirSync(dataModelsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }

  const tableName = entry.name;
  const viewPath = path.join(dataModelsRoot, tableName, 'view.json');
  if (!fs.existsSync(viewPath)) {
    continue;
  }

  const typePath = path.join(dataModelsRoot, tableName, 'type.ts');
  generateTypeFile(tableName, viewPath, typePath);
  exportLines.push(
    `export type { ${getInterfaceName(tableName)} } from './${tableName}/type';`,
  );
}

fs.writeFileSync(barrelPath, `${exportLines.sort().join('\n')}\n`, 'utf8');
