import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Explicit "DB touch" table used only to keep the Render-managed Postgres awake.
 * We insert + delete a row on a schedule, so DB connections stay warm.
 */
@Entity({ name: 'keepalive_db_touch' })
export class KeepaliveDbTouch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

