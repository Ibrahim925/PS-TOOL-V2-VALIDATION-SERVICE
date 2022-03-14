import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	BaseEntity,
	CreateDateColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity()
export class Error extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	errorRun: number;

	@Column()
	errorProject: string;

	@Column()
	errorObject: string;

	@Column()
	errorCount: number;

	@Column()
	errorFree: number;

	@Column()
	errorDependency: number;

	@Column()
	errorDataType: number;

	@Column()
	errorExistence: number;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
