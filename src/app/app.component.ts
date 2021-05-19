import { Component, OnInit } from '@angular/core';
import { UserService } from './api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  connectionStatus = '';
  users$ = this.userService.users$;

  constructor(private readonly userService: UserService) {}

  ngOnInit(): void {}

  fetchUsers(): void {
    this.userService.fetchUsers();
  }

  addUser(name: string): void {
    this.userService.addUser({
      name
    });
  }

  updateUser(): void {
    this.userService.updateUser({
      name: 'Johnny'
    }, 2);
  }

  deleteUser(id: number | string): void {
    this.userService.deleteUser(id);
  }

  getOnlineStatus(): void {
    this.connectionStatus = navigator.onLine ? 'online' : 'offline';
  }
}
