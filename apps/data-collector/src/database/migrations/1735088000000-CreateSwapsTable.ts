import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSwapsTable1735088000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the parent table
    await queryRunner.query(`
      CREATE TABLE swaps (
        signature CHAR(88) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        signer CHAR(44) NOT NULL,
        amm CHAR(44) NOT NULL,
        direction INT NOT NULL,
        amount_in BIGINT NOT NULL,
        amount_out BIGINT NOT NULL,
        CONSTRAINT pk_swaps PRIMARY KEY (signature, timestamp)
      );

      CREATE INDEX idx_signer_swaps ON swaps(signer);
      CREATE INDEX idx_amm_swaps ON swaps(amm);
      CREATE INDEX idx_timestamp_amm_swaps ON swaps(amm, timestamp);
    `);

    // Create extension for partitioning (if not exists)
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pg_partman;
      CREATE SCHEMA IF NOT EXISTS partman;
    `);

    // Set up partman for automatic partitioning
    await queryRunner.query(`
      SELECT partman.create_parent(
        p_parent_table => 'public.swaps',
        p_control => 'timestamp',
        p_type => 'range',
        p_interval=> '1 day',
        p_premake => 30
      );

      UPDATE partman.part_config 
      SET infinite_time_partitions = true,
          retention = '35 days',
          retention_keep_table = false 
      WHERE parent_table = 'public.swaps';
    `);

    // Set up maintenance job
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pg_cron;
      SELECT cron.schedule(
        'swaps_maintenance',
        '@hourly',
        $$CALL partman.run_maintenance_proc()$$
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS swaps CASCADE;
      DROP EXTENSION IF EXISTS pg_partman CASCADE;
      DROP SCHEMA IF EXISTS partman CASCADE;
    `);
  }
}
