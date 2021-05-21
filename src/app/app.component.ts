import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConnectionStatusService } from './connection-status.service';
import { UserService } from './user.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  private users$ = this.userService.users$;
  private isOnline$ = this.connectionStatusService.isOnline$;
  private hasPendingRequests$ = this.userService.hasPendingRequests$;

  vm$ = combineLatest([
    this.users$,
    this.isOnline$,
    this.hasPendingRequests$,
  ]).pipe(
    map(([users, isOnline, hasPendingRequests]) => ({
      users,
      isOnline,
      hasPendingRequests,
    }))
  );

  @ViewChild('name') newName?: ElementRef;

  constructor(
    private readonly userService: UserService,
    private readonly connectionStatusService: ConnectionStatusService
  ) {}

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
      name,
    });
    this.newName.nativeElement.value = '';
  }

  updateUser(): void {
    this.userService.updateUser(
      {
        name: 'Johnny',
      },
      2
    );
  }

  deleteUser(id: number | string): void {
    this.userService.deleteUser(id);
  }

  sync(): void {
    this.userService.sync();
  }
}
