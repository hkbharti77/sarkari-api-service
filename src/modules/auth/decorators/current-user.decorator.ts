import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the authenticated admin user from the request object.
 * Usage: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
