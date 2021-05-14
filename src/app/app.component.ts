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

  ngOnInit(): void {
    this.fetchUsers();
  }

  fetchUsers(): void {
    this.userService.fetchUsers();
  }

  addUser(): void {
    this.userService.addUser({
      name: 'Bobby'
    });
  }

  updateUser(): void {
    this.userService.updateUser({
      name: 'Johnny'
    }, 2);
  }

  deleteUser(): void {
    this.userService.deleteUser(2);
  }

  getOnlineStatus(): void {
    this.connectionStatus = navigator.onLine ? 'online' : 'offline';
  }
}
