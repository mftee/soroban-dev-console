import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { WorkspacesService } from "./workspaces.service.js";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "./workspace.dto.js";

@Controller("api/workspaces")
export class WorkspacesController {
  constructor(private readonly service: WorkspacesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateWorkspaceDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.service.update(id, dto);
import { Controller, Get } from "@nestjs/common";

@Controller("workspaces")
@UseGuards(OwnerKeyGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  list(@Req() req: Request) {
    return this.workspacesService.list((req as any).ownerKey);
  }

  @Get(":id")
  get(@Param("id") id: string, @Req() req: Request) {
    return this.workspacesService.get(id, (req as any).ownerKey);
  }

  @Post()
  create(@Body() dto: CreateWorkspaceDto, @Req() req: Request) {
    return this.workspacesService.create((req as any).ownerKey, dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateWorkspaceDto, @Req() req: Request) {
    return this.workspacesService.update(id, (req as any).ownerKey, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.workspacesService.remove(id, (req as any).ownerKey);
  }

  @Post("import")
  import(@Body() dto: ImportWorkspaceDto, @Req() req: Request) {
    return this.workspacesService.import((req as any).ownerKey, dto);
  }

  @Get(":id/export")
  export(@Param("id") id: string, @Req() req: Request) {
    return this.workspacesService.export(id, (req as any).ownerKey);
  }
}
