import { Module } from "@nestjs/common";
import { WorkspacesController } from "./workspaces.controller.js";
import { WorkspacesService } from "./workspaces.service.js";

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService],

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, PrismaService],
})
export class WorkspacesModule {}
