import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { User, UserDto } from './user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private base = 'http://localhost:3000/api/users';
  private userSubject = new BehaviorSubject<User[]>([]);

  private users: User[] = [];

  get users$(): Observable<User[]> {
    return this.userSubject.asObservable();
  }

  constructor(private http: HttpClient) { }

  fetchUsers(): void {
    this.http.get<User[]>(this.base).pipe(
      timeout(5000),
      catchError((e) => {
        console.error(e);
        return of([]);
      })
    ).subscribe((users) => {
      this.users = [ ...users ];
      this.userSubject.next(this.users);
    });
  }

  addUser(userDto: UserDto): void {
    this.http.post<User>(this.base, { ...userDto }).subscribe(user => {
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
}
