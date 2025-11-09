import { Module, Global } from '@nestjs/common';
import { RbacService } from './rbac.service';

/**
 * RBAC module - Global module for role-based access control
 */
@Global()
@Module({
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
