import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Id } from '../id.type';
import { User } from '../user.interface';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  @Input() users?: User[];
  @Input() isOnline?: boolean;
  @Input() hasPendingRequests?: boolean;

  @Output() deleteUser = new EventEmitter<Id>();
  @Output() sync = new EventEmitter<void>();
  @Output() fetchUsers = new EventEmitter<void>();
  @Output() fetchFromDb = new EventEmitter<void>();

  constructor() {}

  ngOnInit(): void {}
}
