import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../lib/prisma.service.js";
import type { CreateWorkspaceDto, UpdateWorkspaceDto, ImportWorkspaceDto } from "./dto/workspace.dto.js";

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  list(ownerKey: string) {
    return this.prisma.workspace.findMany({
      where: { ownerKey },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, description: true, selectedNetwork: true, createdAt: true, updatedAt: true },
    });
  }

  async get(id: string, ownerKey: string) {
    const workspace = await this.prisma.workspace.findFirst({ where: { id, ownerKey } });
    if (!workspace) throw new NotFoundException("Workspace not found");
    return workspace;
  }

  create(ownerKey: string, dto: CreateWorkspaceDto) {
    return this.prisma.workspace.create({
      data: { ownerKey, name: dto.name, description: dto.description, selectedNetwork: dto.selectedNetwork ?? "testnet" },
    });
  }

  async update(id: string, ownerKey: string, dto: UpdateWorkspaceDto) {
    await this.get(id, ownerKey);
    return this.prisma.workspace.update({ where: { id }, data: dto });
  }

  async remove(id: string, ownerKey: string) {
    await this.get(id, ownerKey);
    await this.prisma.workspace.delete({ where: { id } });
  }

  /** Import a versioned workspace snapshot. Rejects unknown versions and duplicate IDs. */
  async import(ownerKey: string, dto: ImportWorkspaceDto) {
    if (dto.version !== 2) {
      throw new BadRequestException(`Unsupported workspace version: ${dto.version}. Only version 2 is accepted.`);
    }

    const existing = await this.prisma.workspace.findUnique({ where: { id: dto.id } });
    if (existing) {
      throw new ConflictException(`A workspace with id "${dto.id}" already exists. Delete it first or use a new id.`);
    }

    return this.prisma.workspace.create({
      data: {
        id: dto.id,
        ownerKey,
        name: dto.name,
        selectedNetwork: dto.selectedNetwork,
      },
    });
  }

  /** Export a workspace as a versioned snapshot payload. */
  async export(id: string, ownerKey: string) {
    const workspace = await this.get(id, ownerKey);
    return {
      version: 2,
      id: workspace.id,
      name: workspace.name,
      selectedNetwork: workspace.selectedNetwork,
      contractIds: [],
      savedCallIds: [],
      artifactRefs: [],
      createdAt: workspace.createdAt.getTime(),
      updatedAt: workspace.updatedAt.getTime(),
    };
  }
} from "@nestjs/common";
import { prisma } from "../../lib/prisma.js";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "./workspace.dto.js";

@Injectable()
export class WorkspacesService {
  async list() {
    return prisma.workspace.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string) {
    const workspace = await prisma.workspace.findUnique({ where: { id } });
    if (!workspace) throw new NotFoundException(`Workspace ${id} not found`);
    return workspace;
  }

  async create(dto: CreateWorkspaceDto) {
    if (!dto.name?.trim()) throw new BadRequestException("name is required");
    return prisma.workspace.create({ data: { name: dto.name.trim() } });
  }

  async update(id: string, dto: UpdateWorkspaceDto) {
    await this.findById(id);
    if (dto.name !== undefined && !dto.name.trim())
      throw new BadRequestException("name must not be empty");
    return prisma.workspace.update({
      where: { id },
      data: { ...(dto.name !== undefined && { name: dto.name.trim() }) },
    });
  }
}
