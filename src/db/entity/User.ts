import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	BaseEntity,
	CreateDateColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity()
export class User extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	userEmail: string;

	@Column({ select: false })
	userPassword: string;

	@Column({ nullable: true })
	userProject: string;

	@Column()
	userType: "ADMIN" | "CUSTOMER";

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
