import { Component, Input, OnInit } from '@angular/core';
import { PendingRequest } from '../pending-request.interface';

@Component({
  selector: 'app-pending-requests',
  templateUrl: './pending-requests.component.html',
  styleUrls: ['./pending-requests.component.scss'],
})
export class PendingRequestsComponent implements OnInit {
  @Input() pendingRequests?: PendingRequest[];

  constructor() {}

  ngOnInit(): void {}
}
