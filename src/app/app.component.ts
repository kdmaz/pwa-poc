import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { UserService } from './user.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  connectionStatus = '';
  users$ = this.userService.users$;

  @ViewChild('name') newName?: ElementRef;

  constructor(private readonly userService: UserService) {}

  ngOnInit(): void {}

  fetchUsers(): void {
    this.userService.fetchUsers();
  }

  addUser(): void {
    if (!this.newName) {
      return;
    }

    const name = this.newName.nativeElement.value;
    this.newName.nativeElement.value = '';

    this.userService.addUser({
      name
    });
    this.newName.nativeElement.value = '';
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

  sync(): void {
    this.userService.sync();
  }
}
