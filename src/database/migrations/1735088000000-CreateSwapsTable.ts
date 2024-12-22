import { config } from 'dotenv';
import { MigrationInterface, QueryRunner } from 'typeorm';
config();
export class CreateSwapsTable1735088000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the table with partitioning
    let sql = `
        CREATE TABLE swap_history (
        signature CHAR(88) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        signer CHAR(44) NOT NULL,
        amm CHAR(44) NOT NULL,
        direction INT NOT NULL,
        amount_in BIGINT NOT NULL,
        amount_out BIGINT NOT NULL,
        CONSTRAINT pk_swap_history PRIMARY KEY (signature, timestamp)
      ) PARTITION BY RANGE (timestamp);

      CREATE INDEX idx_signer_swap_history ON swap_history(signer);
      CREATE INDEX idx_amm_swap_history ON swap_history(amm);
      CREATE INDEX idx_timestamp_amm_swap_history ON swap_history(amm, timestamp);

    `;
    if (process.env.NO_PG_PARTMAN !== 'true') {
      sql += `
      CREATE SCHEMA IF NOT EXISTS partman;
      CREATE EXTENSION IF NOT EXISTS pg_partman WITH SCHEMA partman;

      SELECT partman.create_parent(
        p_parent_table => 'public.swap_history',
        p_control => 'timestamp',
        p_type => 'range',
        p_interval => '1 day',
        p_premake => 30
      );

      CREATE EXTENSION IF NOT EXISTS pg_cron;

      UPDATE partman.part_config 
      SET infinite_time_partitions = true,
          retention = '35 days', 
          retention_keep_table = false 
      WHERE parent_table = 'public.swap_history';

      SELECT cron.schedule('smart_money_analyst cron', '@hourly', $$CALL partman.run_maintenance_proc()$$);
    `;
    }

    // Create the parent table with partitioning
    await queryRunner.query(sql);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the table and related configurations
    await queryRunner.query(`
      DROP TABLE IF EXISTS swap_history CASCADE;
      DROP SCHEMA IF EXISTS partman CASCADE;
      DROP EXTENSION IF EXISTS pg_partman CASCADE;
      DROP EXTENSION IF EXISTS pg_cron CASCADE;
    `);
  }
}
