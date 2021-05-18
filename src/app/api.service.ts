import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';
import { User, UserDto } from './user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private base = 'http://localhost:3000/api/users';
  private userSubject = new BehaviorSubject<User[]>([]);
  private USER_STORE = 'UserStore';

  private users: User[] = [];

  get users$(): Observable<User[]> {
    return this.userSubject.asObservable();
  }

  constructor(private http: HttpClient, private readonly ngxIndexedService: NgxIndexedDBService) {}

  fetchUsers(): void {
    this.http.get<User[]>(this.base).pipe(
      timeout(5000),
      catchError(() => {
        this.getUsersFromDb();
        return EMPTY;
      }),
      switchMap((users) => this.ngxIndexedService.clear(this.USER_STORE).pipe(map(() => users))),
      switchMap((users) => this.ngxIndexedService.bulkAdd('UserStore', users).pipe(map(() => users)))
    ).subscribe((users) => {
      this.users = [ ...users ];
      this.userSubject.next(this.users);
    });
  }

  addUser(userDto: UserDto): void {
    this.http.post<User>(this.base, { ...userDto }).pipe(
      timeout(5000),
      catchError(() => {

        return EMPTY;
      })
    ).subscribe(user => {
      this.users.push(user);
      this.userSubject.next(this.users);
    });
  }

  updateUser(userDto: UserDto, id: number): void {
    this.http.put<User>(`${this.base}/${id}`, { ...userDto }).subscribe(user => {
      const index = this.users.findIndex(u => u.id === user.id);

      if (index === -1) {
        throw new Error(`${user.id} not found!`);
      }

      this.users[index] = user;
      this.userSubject.next(this.users);
    });
  }

  deleteUser(id: number): void {
    this.http.delete<void>(`${this.base}/${id}`).subscribe(() => {
      this.users = this.users.filter((user) => user.id !== id);
      this.userSubject.next(this.users);
    });
  }

  private getUsersFromDb(): void {
    this.ngxIndexedService.getAll<User>('UserStore').subscribe((users) => {
      if (!users) {
        console.log('no users in db');
        return;
      }
      this.users = [ ...users ];
      this.userSubject.next(this.users);
    });
  }
}
