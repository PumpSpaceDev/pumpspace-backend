import dataSource from '../src/database/typeorm.config';

async function generateMigration() {
  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.destroy();
    console.log('Migration generated successfully');
  } catch (error) {
    console.error('Error generating migration:', error);
    process.exit(1);
  }
}

generateMigration();
