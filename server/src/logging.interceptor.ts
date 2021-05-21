import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Request } from "express";
import { Observable } from "rxjs";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const { method, body, url }: Request = context.switchToHttp().getRequest();
    console.log(method, url, body);
    const message = `{${url}, ${method}}, body: ${JSON.stringify(body)}`;
    new Logger().log(message);
    return next.handle();
  }
}
