
# Zod Schemas for Shovel Heroes API

This directory contains Zod schemas generated from the OpenAPI components['schemas'] section using ts-to-zod.

## Usage

```typescript
import { idSchema, timestampSchema, disasterAreaSchema, supplyNeedSchema, gridSchema, volunteerRegistrationSchema, supplyDonationSchema, gridDiscussionSchema, announcementSchema, externalLinkSchema, userSchema, volunteerStatusSchema, volunteerListItemSchema, volunteersListResponseSchema, errorSchema } from './schemas';

// Validate individual entities
const disasterArea = disasterAreaSchema.parse(data);
const id = idSchema.parse(idData);
const timestamp = timestampSchema.parse(timeData);
const supplyNeed = supplyNeedSchema.parse(supplyData);
```

## Available Schemas

All schemas from the OpenAPI components['schemas'] section are automatically exported with flattened names:
- idSchema, timestampSchema (primitive types)
- disasterAreaSchema, supplyNeedSchema, gridSchema, volunteerRegistrationSchema, supplyDonationSchema, gridDiscussionSchema, announcementSchema, externalLinkSchema, userSchema, volunteerListItemSchema, volunteersListResponseSchema (entity types)
- errorSchema (error types)

## Generation

These schemas are generated from the OpenAPI components['schemas'] section using the `generate-schemas.ts` script. The script:
1. Extracts schemas from openapi.ts
2. Creates flattened key schemas with actual type definitions
3. Runs ts-to-zod on the flattened schemas
4. Outputs the result as schemas/index.ts
5. Cleans up intermediate files

To regenerate them:

```bash
npm run schemas:generate
```
