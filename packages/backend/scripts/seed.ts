#!/usr/bin/env tsx
import 'dotenv/config';
import { faker } from '@faker-js/faker';
import pg from 'pg';

const { Pool } = pg;

interface SeedOptions {
  users?: number;
  disasterAreas?: number;
  gridsPerArea?: number;
  volunteersPerGrid?: number;
  donationsPerGrid?: number;
  discussionsPerGrid?: number;
  announcements?: number;
}

const DEFAULT_OPTIONS: SeedOptions = {
  users: 20,
  disasterAreas: 3,
  gridsPerArea: 5,
  volunteersPerGrid: 3,
  donationsPerGrid: 2,
  discussionsPerGrid: 4,
  announcements: 10,
};

async function seed(options: SeedOptions = DEFAULT_OPTIONS) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🌱 Starting database seeding...\n');

    // Generate unique timestamp-based prefix to avoid ID collisions
    const timestamp = Date.now();

    // Seed users
    console.log(`👥 Seeding ${options.users} users...`);
    const userIds: string[] = [];
    for (let i = 0; i < options.users!; i++) {
      const userId = `seed_user_${timestamp}_${i + 1}`;
      const name = faker.person.fullName();
      const email = faker.internet.email();
      const avatarUrl = faker.image.avatar();
      const role = faker.helpers.arrayElement(['user', 'user', 'user', 'admin']); // 75% users, 25% admins

      await pool.query(
        `INSERT INTO users (id, name, email, avatar_url, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, name, email, avatarUrl, role, faker.date.past()]
      );
      userIds.push(userId);
    }
    console.log(`✅ Created ${userIds.length} users\n`);

    // Seed disaster areas
    console.log(`🗺️  Seeding ${options.disasterAreas} disaster areas...`);
    const disasterAreaIds: string[] = [];
    const taiwanCounties = [
      { county: '高雄市', townships: ['美濃區', '杉林區', '甲仙區', '六龜區', '旗山區'] },
      { county: '台南市', townships: ['關廟區', '龍崎區', '玉井區', '楠西區', '南化區'] },
      { county: '嘉義縣', townships: ['阿里山鄉', '番路鄉', '竹崎鄉', '梅山鄉', '大埔鄉'] },
    ];

    for (let i = 0; i < options.disasterAreas!; i++) {
      const areaId = `seed_area_${timestamp}_${i + 1}`;
      const location = taiwanCounties[i % taiwanCounties.length];
      const township = faker.helpers.arrayElement(location.townships);
      const centerLat = faker.location.latitude({ min: 22.5, max: 24.5 });
      const centerLng = faker.location.longitude({ min: 120.0, max: 121.0 });
      const bounds = {
        north: centerLat + 0.05,
        south: centerLat - 0.05,
        east: centerLng + 0.05,
        west: centerLng - 0.05,
      };
      const creatorId = faker.helpers.arrayElement(userIds);

      await pool.query(
        `INSERT INTO disaster_areas (
          id, name, township, county, center_lat, center_lng, bounds,
          grid_size, status, description, created_by_id, is_sample, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          areaId,
          `${township}災區`,
          township,
          location.county,
          centerLat,
          centerLng,
          JSON.stringify(bounds),
          faker.number.int({ min: 10, max: 50 }),
          faker.helpers.arrayElement(['active', 'active', 'completed', 'archived']),
          faker.lorem.paragraph(),
          creatorId,
          true,
          faker.date.past({ years: 0.5 }),
        ]
      );
      disasterAreaIds.push(areaId);
    }
    console.log(`✅ Created ${disasterAreaIds.length} disaster areas\n`);

    // Seed grids
    console.log(`📍 Seeding grids (${options.gridsPerArea} per area)...`);
    const gridIds: string[] = [];
    const gridTypes = ['residential', 'commercial', 'public_facility', 'road', 'agriculture'];
    const statusOptions = ['open', 'in_progress', 'completed', 'blocked'];

    for (const areaId of disasterAreaIds) {
      const areaResult = await pool.query(
        `SELECT center_lat, center_lng, bounds FROM disaster_areas WHERE id = $1`,
        [areaId]
      );
      const area = areaResult.rows[0];

      for (let i = 0; i < options.gridsPerArea!; i++) {
        const gridId = `seed_grid_${timestamp}_${areaId}_${i + 1}`;
        const code = `${areaId.split('_')[3]}-${String(i + 1).padStart(3, '0')}`;
        const offsetLat = faker.number.float({ min: -0.03, max: 0.03 });
        const offsetLng = faker.number.float({ min: -0.03, max: 0.03 });
        const centerLat = area.center_lat + offsetLat;
        const centerLng = area.center_lng + offsetLng;
        const bounds = {
          north: centerLat + 0.005,
          south: centerLat - 0.005,
          east: centerLng + 0.005,
          west: centerLng - 0.005,
        };
        const status = faker.helpers.arrayElement(statusOptions);
        const volunteerNeeded = faker.number.int({ min: 2, max: 10 });
        const creatorId = faker.helpers.arrayElement(userIds);
        const managerId = faker.helpers.maybe(() => faker.helpers.arrayElement(userIds), { probability: 0.6 });

        await pool.query(
          `INSERT INTO grids (
            id, code, grid_type, disaster_area_id, volunteer_needed, volunteer_registered,
            meeting_point, risks_notes, contact_info, center_lat, center_lng, bounds,
            status, supplies_needed, grid_manager_id, completion_photo, created_by_id, is_sample, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          [
            gridId,
            code,
            faker.helpers.arrayElement(gridTypes),
            areaId,
            volunteerNeeded,
            0, // Will be updated after volunteer registrations
            faker.location.streetAddress(),
            faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.7 }),
            faker.phone.number(),
            centerLat,
            centerLng,
            JSON.stringify(bounds),
            status,
            JSON.stringify({
              water: faker.number.int({ min: 0, max: 100 }),
              food: faker.number.int({ min: 0, max: 50 }),
              medical: faker.number.int({ min: 0, max: 20 }),
              tools: faker.number.int({ min: 0, max: 30 }),
            }),
            managerId,
            status === 'completed' ? faker.image.url() : null,
            creatorId,
            true,
            faker.date.past({ years: 0.3 }),
          ]
        );
        gridIds.push(gridId);
      }
    }
    console.log(`✅ Created ${gridIds.length} grids\n`);

    // Seed volunteer registrations
    console.log(`🙋 Seeding volunteer registrations...`);
    let volunteerCount = 0;
    const registrationStatus = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled'];

    for (const gridId of gridIds) {
      const numVolunteers = faker.number.int({ min: 0, max: options.volunteersPerGrid! });

      for (let i = 0; i < numVolunteers; i++) {
        const regId = `seed_reg_${timestamp}_${gridId}_${i + 1}`;
        const userId = faker.helpers.arrayElement(userIds); // Always use a user_id
        const status = faker.helpers.arrayElement(registrationStatus);

        await pool.query(
          `INSERT INTO volunteer_registrations (
            id, grid_id, user_id, volunteer_name, volunteer_phone, volunteer_email,
            available_time, skills, equipment, status, check_in_time, notes, is_sample, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            regId,
            gridId,
            userId,
            null, // volunteer_name not needed when user_id is present
            faker.phone.number(),
            null, // volunteer_email not needed when user_id is present
            faker.helpers.arrayElement(['上午', '下午', '全天', '週末']),
            JSON.stringify(faker.helpers.arrayElements(['挖土', '搬運', '清潔', '修繕', '醫療'], { min: 1, max: 3 })),
            JSON.stringify(faker.helpers.arrayElements(['鏟子', '手套', '雨鞋', '工具箱'], { min: 0, max: 2 })),
            status,
            status === 'checked_in' || status === 'completed' ? faker.date.recent() : null,
            faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.5 }),
            true,
            faker.date.recent({ days: 30 }),
          ]
        );
        volunteerCount++;
      }

      // Update volunteer_registered count
      await pool.query(
        `UPDATE grids SET volunteer_registered = (
          SELECT COUNT(*) FROM volunteer_registrations
          WHERE grid_id = $1 AND status NOT IN ('cancelled')
        ) WHERE id = $1`,
        [gridId]
      );
    }
    console.log(`✅ Created ${volunteerCount} volunteer registrations\n`);

    // Seed supply donations
    console.log(`📦 Seeding supply donations...`);
    let donationCount = 0;
    const supplyTypes = [
      { name: '礦泉水', unit: '箱' },
      { name: '便當', unit: '份' },
      { name: '急救包', unit: '個' },
      { name: '鏟子', unit: '把' },
      { name: '手套', unit: '雙' },
      { name: '口罩', unit: '盒' },
      { name: '雨鞋', unit: '雙' },
      { name: '發電機', unit: '台' },
    ];

    for (const gridId of gridIds) {
      const numDonations = faker.number.int({ min: 0, max: options.donationsPerGrid! });

      for (let i = 0; i < numDonations; i++) {
        const donationId = `seed_donation_${timestamp}_${gridId}_${i + 1}`;
        const supply = faker.helpers.arrayElement(supplyTypes);

        await pool.query(
          `INSERT INTO supply_donations (id, grid_id, name, quantity, unit, donor_contact, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            donationId,
            gridId,
            supply.name,
            faker.number.int({ min: 1, max: 50 }),
            supply.unit,
            faker.helpers.maybe(() => faker.phone.number(), { probability: 0.7 }),
            faker.date.recent({ days: 20 }),
          ]
        );
        donationCount++;
      }
    }
    console.log(`✅ Created ${donationCount} supply donations\n`);

    // Seed grid discussions
    console.log(`💬 Seeding grid discussions...`);
    let discussionCount = 0;

    for (const gridId of gridIds) {
      const numDiscussions = faker.number.int({ min: 0, max: options.discussionsPerGrid! });

      for (let i = 0; i < numDiscussions; i++) {
        const discussionId = `seed_discussion_${timestamp}_${gridId}_${i + 1}`;
        const userId = faker.helpers.maybe(() => faker.helpers.arrayElement(userIds), { probability: 0.8 });

        let authorName: string | null = null;
        let authorRole: string | null = null;

        if (userId) {
          const userResult = await pool.query(`SELECT name, role FROM users WHERE id = $1`, [userId]);
          if (userResult.rows.length > 0) {
            authorName = userResult.rows[0].name;
            authorRole = userResult.rows[0].role;
          }
        } else {
          authorName = faker.person.fullName();
          authorRole = 'visitor';
        }

        await pool.query(
          `INSERT INTO grid_discussions (id, grid_id, user_id, content, author_name, author_role, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            discussionId,
            gridId,
            userId,
            faker.lorem.paragraph(),
            authorName,
            authorRole,
            faker.date.recent({ days: 15 }),
          ]
        );
        discussionCount++;
      }
    }
    console.log(`✅ Created ${discussionCount} grid discussions\n`);

    // Seed announcements
    console.log(`📢 Seeding ${options.announcements} announcements...`);
    const categories = ['緊急通知', '活動公告', '物資需求', '志工招募', '注意事項'];

    for (let i = 0; i < options.announcements!; i++) {
      const announcementId = `seed_announcement_${timestamp}_${i + 1}`;
      const creatorId = faker.helpers.arrayElement(userIds);
      const isPinned = faker.datatype.boolean(0.2); // 20% pinned

      await pool.query(
        `INSERT INTO announcements (
          id, title, body, content, category, is_pinned, external_links,
          contact_phone, "order", created_by_id, is_sample, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          announcementId,
          faker.lorem.sentence(),
          faker.lorem.paragraph(),
          faker.lorem.paragraphs(3),
          faker.helpers.arrayElement(categories),
          isPinned,
          JSON.stringify(
            faker.helpers.maybe(
              () => [
                { title: faker.lorem.words(3), url: faker.internet.url() },
              ],
              { probability: 0.5 }
            ) || []
          ),
          faker.helpers.maybe(() => faker.phone.number(), { probability: 0.6 }),
          isPinned ? faker.number.int({ min: 1, max: 5 }) : null,
          creatorId,
          true,
          faker.date.recent({ days: 60 }),
        ]
      );
    }
    console.log(`✅ Created ${options.announcements} announcements\n`);

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Users: ${userIds.length}`);
    console.log(`   Disaster Areas: ${disasterAreaIds.length}`);
    console.log(`   Grids: ${gridIds.length}`);
    console.log(`   Volunteer Registrations: ${volunteerCount}`);
    console.log(`   Supply Donations: ${donationCount}`);
    console.log(`   Grid Discussions: ${discussionCount}`);
    console.log(`   Announcements: ${options.announcements}\n`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const customOptions: SeedOptions = { ...DEFAULT_OPTIONS };

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '');
  const value = parseInt(args[i + 1], 10);
  if (!isNaN(value) && key in customOptions) {
    (customOptions as any)[key] = value;
  }
}

seed(customOptions).catch((err) => {
  console.error(err);
  process.exit(1);
});
