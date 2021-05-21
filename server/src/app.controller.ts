import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { User, UserDto } from "./user.interface";

@Controller("/api/users")
export class AppController {
  private inMemoryUsers: User[] = [];
  private nextUserId = 1;

  constructor() {}

  @Get()
  getUsers(): User[] {
    return this.inMemoryUsers;
  }

  @Post()
  addUser(@Body() { name }: UserDto): User {
    const user = { id: this.nextUserId, name };
    this.inMemoryUsers.push(user);
    this.nextUserId++;
    return user;
  }

  @Patch(":id")
  updateUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() { name }: UserDto
  ): User {
    const index = this.inMemoryUsers.findIndex((user) => user.id === id);

    if (index === -1) {
      throw new NotFoundException();
    }

    const updatedUser = { id, name };
    this.inMemoryUsers[index] = updatedUser;
    return updatedUser;
  }

  @Delete(":id")
  deleteUser(@Param("id", ParseIntPipe) id: number): void {
    this.inMemoryUsers = this.inMemoryUsers.filter((user) => user.id !== id);
  }
}
