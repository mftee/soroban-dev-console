import {
  IsString,
  IsOptional,
  IsIn,
  MaxLength,
  IsArray,
  IsObject,
  IsInt,
  Min,
} from "class-validator";

const NETWORKS = ["testnet", "mainnet", "futurenet", "local"] as const;

export class CreateWorkspaceDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(NETWORKS)
  selectedNetwork?: string;
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(NETWORKS)
  selectedNetwork?: string;
}

export class ImportWorkspaceDto {
  /** Must be 2 — older versions are rejected to avoid silent data corruption */
  @IsInt()
  @Min(2)
  version!: number;

  @IsString()
  id!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsArray()
  @IsString({ each: true })
  contractIds!: string[];

  @IsArray()
  @IsString({ each: true })
  savedCallIds!: string[];

  @IsArray()
  @IsObject({ each: true })
  artifactRefs!: object[];

  @IsString()
  selectedNetwork!: string;
}
