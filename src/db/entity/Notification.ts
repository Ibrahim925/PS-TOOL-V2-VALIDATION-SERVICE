import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	BaseEntity,
	CreateDateColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity()
export class Notification extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	notificationDate: string;

	@Column()
	notificationTime: string;

	@Column()
	notificationText: string;

	@Column()
	notificationProject: string;

	@Column()
	notificationObject: string;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
