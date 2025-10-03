#!/usr/bin/env tsx

/**
 * Schema generation script that uses ts-to-zod generated schemas
 *
 * This script:
 * 1. Extracts components['schemas'] from openapi.ts
 * 2. Runs ts-to-zod on the extracted schemas
 * 3. Creates a schemas file with the generated schemas
 */

import { execSync } from "child_process";
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");
const srcDir = join(projectRoot, "src");
const schemasDir = join(srcDir, "schemas");

// Ensure schemas directory exists
if (!existsSync(schemasDir)) {
  mkdirSync(schemasDir, { recursive: true });
}

console.log("🚀 Generating schemas...");

const openapiContent = readFileSync(join(srcDir, "openapi.ts"), "utf-8");

// Extract the schemas section directly from the openapi.ts file
const schemasStart = openapiContent.indexOf("schemas: {");
if (schemasStart === -1) {
  console.error("❌ Could not find 'schemas: {' in openapi.ts");
  process.exit(1);
}

// Find the end of the schemas section by looking for the responses section
const responsesStart = openapiContent.indexOf("responses:", schemasStart);
if (responsesStart === -1) {
  console.error("❌ Could not find 'responses:' after schemas section");
  process.exit(1);
}

// Find the last } before responses:
let schemasEnd = responsesStart;
for (let i = responsesStart - 1; i >= schemasStart; i--) {
  if (openapiContent[i] === "}") {
    schemasEnd = i + 1;
    break;
  }
}

const schemasContent = openapiContent.substring(schemasStart, schemasEnd);

// Create a simplified types file with just the schemas
let extractedSchemas = schemasContent
  .replace(/schemas: \{/, "export interface Schemas {")
  .replace(/components\["schemas"\]\["([^"]+)"\]/g, 'Schemas["$1"]');

const finalExtractedSchemas = `
/**
 * Extracted schemas from OpenAPI components
 * Auto-generated from openapi.ts
 */

${extractedSchemas}
`;

writeFileSync(join(srcDir, "extracted-schemas.ts"), finalExtractedSchemas);

const extractedSchemasContent = readFileSync(
  join(srcDir, "extracted-schemas.ts"),
  "utf-8"
);

const interfaceKeys: string[] = [];
const interfaceKeyMatches = extractedSchemasContent.matchAll(
  /^\s*([A-Z][a-zA-Z0-9]*):/gm
);
for (const match of interfaceKeyMatches) {
  interfaceKeys.push(match[1]);
}

// Extract the actual type definitions from the extracted schemas
const extractTypeDefinition = (key: string, content: string): string => {
  // Find the key definition in the content - look for the key followed by colon
  const keyStart = content.indexOf(`${key}:`);
  if (keyStart === -1) {
    console.warn(`⚠️ Could not find type definition for ${key}`);
    return `export type ${key}Schema = any;`;
  }

  // Find the start of the type definition (after the colon)
  let typeStart = keyStart + key.length + 1;
  while (
    content[typeStart] === " " ||
    content[typeStart] === "\n" ||
    content[typeStart] === "\t"
  ) {
    typeStart++;
  }

  // For simple types (string, number, etc.), find the end at the next semicolon or newline
  if (content[typeStart] !== "{") {
    let typeEnd = typeStart;
    while (
      typeEnd < content.length &&
      content[typeEnd] !== ";" &&
      content[typeEnd] !== "\n"
    ) {
      typeEnd++;
    }
    let typeDefinition = content.substring(typeStart, typeEnd).trim();

    // Replace Schemas["Key"] references with the actual key names
    typeDefinition = typeDefinition.replace(/Schemas\["([^"]+)"\]/g, "$1");

    return `export type ${key} = ${typeDefinition};`;
  }

  // For object types, find the matching closing brace
  let braceCount = 0;
  let typeEnd = typeStart;
  let foundEnd = false;

  for (let i = typeStart; i < content.length; i++) {
    const char = content[i];
    if (char === "{") {
      braceCount++;
    } else if (char === "}") {
      braceCount--;
      if (braceCount === 0) {
        typeEnd = i + 1;
        foundEnd = true;
        break;
      }
    }
  }

  if (!foundEnd) {
    console.warn(`⚠️ Could not find closing brace for ${key}`);
    return `export type ${key}Schema = any;`;
  }

  let typeDefinition = content.substring(typeStart, typeEnd).trim();

  // Replace Schemas["Key"] references with the actual key names
  typeDefinition = typeDefinition.replace(/Schemas\["([^"]+)"\]/g, "$1");

  return `export type ${key} = ${typeDefinition};`;
};

const flattenedTypes = interfaceKeys
  .map((key) => extractTypeDefinition(key, extractedSchemasContent))
  .join("\n\n");

const flattenKeySchemaContent = `
/**
 * Flattened key schemas from OpenAPI components
 * Auto-generated from extracted-schemas.ts
 * Each key from the Schemas interface is exported with its actual type definition
 */

${flattenedTypes}
`;

writeFileSync(join(srcDir, "flatten-key-schema.ts"), flattenKeySchemaContent);

console.log("📝 Running ts-to-zod...");
try {
  execSync(
    "npx ts-to-zod src/flatten-key-schema.ts src/flatten-key-schema-generated.ts",
    {
      cwd: projectRoot,
      stdio: "inherit",
    }
  );
} catch (error) {
  console.error("❌ ts-to-zod failed:", error);
  process.exit(1);
}

let flattenKeyGeneratedSchemas = "";
try {
  flattenKeyGeneratedSchemas = readFileSync(
    join(srcDir, "flatten-key-schema-generated.ts"),
    "utf-8"
  );
} catch (error) {
  console.error("❌ Could not read generated schemas:", error);
  process.exit(1);
}

// Check if the generated schemas are empty or invalid
if (
  !flattenKeyGeneratedSchemas ||
  flattenKeyGeneratedSchemas.trim().length < 100
) {
  console.error(
    "❌ Generated schemas are empty or too short. ts-to-zod failed to generate valid schemas."
  );
  process.exit(1);
}

// Decode Unicode escape sequences to proper Chinese characters
const decodeUnicodeEscapes = (text: string): string => {
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
};

// Rename iDSchema to idSchema for better naming convention
const renameIDSchema = (text: string): string => {
  return text.replace(/iDSchema/g, "idSchema");
};

const decodedSchemas = decodeUnicodeEscapes(flattenKeyGeneratedSchemas);
const renamedSchemas = renameIDSchema(decodedSchemas);

const finalSchemasContent = `
/**
 * Zod schemas generated from OpenAPI components
 * Auto-generated using ts-to-zod from openapi.ts
 */

${renamedSchemas}
`;

writeFileSync(join(schemasDir, "index.ts"), finalSchemasContent);

// Clean up intermediate files
const filesToCleanup = [
  "src/extracted-schemas.ts",
  "src/flatten-key-schema.ts",
  "src/flatten-key-schema-generated.ts",
];

filesToCleanup.forEach((file) => {
  try {
    unlinkSync(join(projectRoot, file));
  } catch (error) {
    console.warn(`⚠️ Could not delete ${file}:`, error.message);
  }
});
const readmeContent = `
# Zod Schemas for Shovel Heroes API

This directory contains Zod schemas generated from the OpenAPI components['schemas'] section using ts-to-zod.

## Usage

\`\`\`typescript
import { idSchema, timestampSchema, disasterAreaSchema, supplyNeedSchema, gridSchema, volunteerRegistrationSchema, supplyDonationSchema, gridDiscussionSchema, announcementSchema, externalLinkSchema, userSchema, volunteerStatusSchema, volunteerListItemSchema, volunteersListResponseSchema, errorSchema } from './schemas';

// Validate individual entities
const disasterArea = disasterAreaSchema.parse(data);
const id = idSchema.parse(idData);
const timestamp = timestampSchema.parse(timeData);
const supplyNeed = supplyNeedSchema.parse(supplyData);
\`\`\`

## Available Schemas

All schemas from the OpenAPI components['schemas'] section are automatically exported with flattened names:
- idSchema, timestampSchema (primitive types)
- disasterAreaSchema, supplyNeedSchema, gridSchema, volunteerRegistrationSchema, supplyDonationSchema, gridDiscussionSchema, announcementSchema, externalLinkSchema, userSchema, volunteerListItemSchema, volunteersListResponseSchema (entity types)
- errorSchema (error types)

## Generation

These schemas are generated from the OpenAPI components['schemas'] section using the \`generate-schemas.ts\` script. The script:
1. Extracts schemas from openapi.ts
2. Creates flattened key schemas with actual type definitions
3. Runs ts-to-zod on the flattened schemas
4. Outputs the result as schemas/index.ts
5. Cleans up intermediate files

To regenerate them:

\`\`\`bash
npm run schemas:generate
\`\`\`
`;

writeFileSync(join(schemasDir, "README.md"), readmeContent);

console.log("✅ Generated schemas/index.ts");
