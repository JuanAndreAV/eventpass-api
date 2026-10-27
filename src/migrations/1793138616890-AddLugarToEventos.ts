import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLugarToEventos1793138616890 implements MigrationInterface {
name = 'AddLugarToEventos1793138616890'
    public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "eventos" ADD COLUMN IF NOT EXISTS "lugar" varchar(255) NOT NULL DEFAULT 'Por definir'`);
    await queryRunner.query(`ALTER TABLE "eventos" ALTER COLUMN "lugar" DROP DEFAULT`);
}

public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "eventos" DROP COLUMN IF EXISTS "lugar"`);
}

}
