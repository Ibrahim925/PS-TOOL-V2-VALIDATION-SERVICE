import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	BaseEntity,
	CreateDateColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity()
export class ObjectData extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	objectProject: string;

	@Column()
	objectName: string;

	@Column()
	objectField: string;

	@Column("text")
	objectValue;

	@Column()
	objectRow: number;

	@Column()
	objectTemp: boolean;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
