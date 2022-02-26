import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	BaseEntity,
	CreateDateColumn,
	UpdateDateColumn,
} from "typeorm";
import { Cases, Config, DataTypes } from "../../types";

@Entity()
export class Rule extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	ruleProject: string;

	@Column()
	ruleObject: string;

	@Column()
	ruleConfiguration: Config;

	@Column()
	ruleField: string;

	@Column()
	ruleFieldOccurrence: number;

	@Column()
	ruleDataType: DataTypes;

	@Column()
	ruleRequired: boolean;

	@Column()
	ruleCase: Cases;

	@Column()
	ruleDependency: string;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
