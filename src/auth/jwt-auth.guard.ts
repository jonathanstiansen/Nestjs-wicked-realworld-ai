import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Auth Guard
 * Use this guard on routes that require authentication
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
