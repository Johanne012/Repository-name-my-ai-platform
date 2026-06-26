import { Request, Response, NextFunction } from 'express';
import { TRPCError } from '@trpc/server';

/**
 * نظام التسجيل المتقدم (Advanced Logging System)
 */
export class RequestLogger {
  private static generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = this.generateRequestId();
      const startTime = Date.now();

      // إضافة معرف الطلب إلى الطلب
      (req as any).requestId = requestId;

      // تسجيل الطلب الوارد
      console.log(`[${requestId}] ${req.method} ${req.path}`, {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      // التقاط الاستجابة
      const originalSend = res.send;
      res.send = function (data: any) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        console.log(`[${requestId}] Response`, {
          statusCode,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });

        return originalSend.call(this, data);
      };

      next();
    };
  }
}

/**
 * نظام معالجة الأخطاء (Error Handling System)
 */
export class ErrorHandler {
  static middleware() {
    return (err: any, req: Request, res: Response, next: NextFunction) => {
      const requestId = (req as any).requestId || 'unknown';
      const timestamp = new Date().toISOString();

      // تسجيل الخطأ
      console.error(`[${requestId}] Error occurred:`, {
        timestamp,
        message: err.message,
        code: err.code,
        stack: err.stack,
        path: req.path,
        method: req.method,
      });

      // تحديد نوع الخطأ والاستجابة المناسبة
      let statusCode = 500;
      let userMessage = 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.';
      let errorCode = 'INTERNAL_SERVER_ERROR';

      if (err instanceof TRPCError) {
        statusCode = this.getTRPCStatusCode(err.code);
        userMessage = err.message;
        errorCode = err.code;
      } else if (err.statusCode) {
        statusCode = err.statusCode;
        userMessage = err.message;
        errorCode = err.code || 'ERROR';
      } else if (err.name === 'ValidationError') {
        statusCode = 400;
        userMessage = 'بيانات غير صحيحة. يرجى التحقق من المدخلات.';
        errorCode = 'VALIDATION_ERROR';
      } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        userMessage = 'غير مصرح. يرجى تسجيل الدخول.';
        errorCode = 'UNAUTHORIZED';
      } else if (err.name === 'ForbiddenError') {
        statusCode = 403;
        userMessage = 'ليس لديك صلاحيات كافية.';
        errorCode = 'FORBIDDEN';
      } else if (err.name === 'NotFoundError') {
        statusCode = 404;
        userMessage = 'المورد المطلوب غير موجود.';
        errorCode = 'NOT_FOUND';
      }

      // إرسال الاستجابة
      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: userMessage,
          requestId,
          timestamp,
        },
      });
    };
  }

  private static getTRPCStatusCode(code: string): number {
    const statusMap: Record<string, number> = {
      PARSE_ERROR: 400,
      BAD_REQUEST: 400,
      NOT_FOUND: 404,
      INTERNAL_SERVER_ERROR: 500,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      CONFLICT: 409,
      PRECONDITION_FAILED: 412,
      PAYLOAD_TOO_LARGE: 413,
      UNPROCESSABLE_CONTENT: 422,
      TOO_MANY_REQUESTS: 429,
      CLIENT_CLOSED_REQUEST: 499,
    };
    return statusMap[code] || 500;
  }
}

/**
 * نظام تنظيف المدخلات (Input Sanitization System)
 */
export class InputSanitizer {
  /**
   * تنظيف النصوص من الأحرف الخطرة
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';

    return input
      .trim()
      .replace(/[<>\"']/g, '') // إزالة الأحرف الخطرة
      .substring(0, 10000); // تحديد الطول الأقصى
  }

  /**
   * تنظيف البريد الإلكتروني
   */
  static sanitizeEmail(input: string): string {
    const email = this.sanitizeString(input).toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? email : '';
  }

  /**
   * تنظيف الأرقام
   */
  static sanitizeNumber(input: any): number {
    const num = parseInt(input, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * تنظيف البيانات بشكل عام
   */
  static sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeString(value);
        } else if (typeof value === 'object') {
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }
    return sanitized;
  }
}

/**
 * نظام تحديد معدل الطلبات (Rate Limiting System)
 */
export class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();
  private static readonly WINDOW_MS = 60 * 1000; // دقيقة واحدة

  static getLimits(plan: string): number {
    const limits: Record<string, number> = {
      free: 100,
      pro: 10000,
      enterprise: Infinity,
    };
    return limits[plan] || 100;
  }

  static middleware(plan: string = 'free') {
    const limit = this.getLimits(plan);

    return (req: Request, res: Response, next: NextFunction) => {
      if (limit === Infinity) {
        return next(); // لا توجد حدود للخطة المؤسسية
      }

      const key = `${(req as any).user?.id || req.ip}:${req.path}`;
      const now = Date.now();
      const record = this.requests.get(key);

      if (!record || now > record.resetTime) {
        this.requests.set(key, { count: 1, resetTime: now + this.WINDOW_MS });
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', limit - 1);
        return next();
      }

      record.count++;

      if (record.count > limit) {
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));

        return res.status(429).json({
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'لقد تجاوزت حد الطلبات المسموح به. يرجى المحاولة لاحقاً.',
            retryAfter: Math.ceil((record.resetTime - now) / 1000),
          },
        });
      }

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', limit - record.count);
      next();
    };
  }

  static reset() {
    this.requests.clear();
  }
}

/**
 * نظام التحقق من الأمان (Security Validation System)
 */
export class SecurityValidator {
  /**
   * التحقق من الحقول المطلوبة
   */
  static validateRequired(obj: any, fields: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of fields) {
      if (!obj[field] || (typeof obj[field] === 'string' && obj[field].trim() === '')) {
        errors.push(`الحقل "${field}" مطلوب`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * التحقق من طول النص
   */
  static validateStringLength(
    value: string,
    min: number = 1,
    max: number = 10000
  ): { valid: boolean; error?: string } {
    if (value.length < min) {
      return { valid: false, error: `الحد الأدنى للطول هو ${min} أحرف` };
    }
    if (value.length > max) {
      return { valid: false, error: `الحد الأقصى للطول هو ${max} أحرف` };
    }
    return { valid: true };
  }

  /**
   * التحقق من صيغة البريد الإلكتروني
   */
  static validateEmail(email: string): { valid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'صيغة البريد الإلكتروني غير صحيحة' };
    }
    return { valid: true };
  }

  /**
   * التحقق من قوة كلمة المرور
   */
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('يجب أن تكون كلمة المرور 8 أحرف على الأقل');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('يجب أن تحتوي على حرف كبير واحد على الأقل');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('يجب أن تحتوي على حرف صغير واحد على الأقل');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('يجب أن تحتوي على رقم واحد على الأقل');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
