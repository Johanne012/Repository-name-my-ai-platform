import { describe, it, expect } from 'vitest';
import { InputSanitizer, RateLimiter, SecurityValidator } from './middleware';

describe('Middleware & Security System', () => {
  describe('InputSanitizer', () => {
    it('يجب تنظيف النصوص من الأحرف الخطرة', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = InputSanitizer.sanitizeString(input);
      
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain('"');
    });

    it('يجب تنظيف البريد الإلكتروني بشكل صحيح', () => {
      const validEmail = 'test@example.com';
      const sanitized = InputSanitizer.sanitizeEmail(validEmail);
      
      expect(sanitized).toBe('test@example.com');
    });

    it('يجب رفض البريد الإلكتروني غير الصحيح', () => {
      const invalidEmail = 'not-an-email';
      const sanitized = InputSanitizer.sanitizeEmail(invalidEmail);
      
      expect(sanitized).toBe('');
    });

    it('يجب تنظيف الأرقام بشكل صحيح', () => {
      expect(InputSanitizer.sanitizeNumber(123)).toBe(123);
      expect(InputSanitizer.sanitizeNumber('456')).toBe(456);
      expect(InputSanitizer.sanitizeNumber('invalid')).toBe(0);
    });

    it('يجب تنظيف الكائنات بشكل عميق', () => {
      const input = {
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
        age: '25',
        nested: {
          value: '<img src=x onerror="alert(1)">',
        },
      };

      const sanitized = InputSanitizer.sanitizeObject(input);

      expect(sanitized.name).not.toContain('<');
      expect(sanitized.nested.value).not.toContain('<');
    });

    it('يجب تحديد طول النص الأقصى', () => {
      const longString = 'a'.repeat(20000);
      const sanitized = InputSanitizer.sanitizeString(longString);
      
      expect(sanitized.length).toBeLessThanOrEqual(10000);
    });
  });

  describe('RateLimiter', () => {
    it('يجب إرجاع الحدود الصحيحة للخطة المجانية', () => {
      const limit = RateLimiter.getLimits('free');
      expect(limit).toBe(100);
    });

    it('يجب إرجاع الحدود الصحيحة للخطة الاحترافية', () => {
      const limit = RateLimiter.getLimits('pro');
      expect(limit).toBe(10000);
    });

    it('يجب عدم وجود حدود للخطة المؤسسية', () => {
      const limit = RateLimiter.getLimits('enterprise');
      expect(limit).toBe(Infinity);
    });

    it('يجب إعادة تعيين السجلات بشكل صحيح', () => {
      RateLimiter.reset();
      const limit = RateLimiter.getLimits('free');
      expect(limit).toBe(100);
    });
  });

  describe('SecurityValidator', () => {
    it('يجب التحقق من الحقول المطلوبة', () => {
      const obj = { name: 'Test', email: '' };
      const result = SecurityValidator.validateRequired(obj, ['name', 'email']);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('يجب قبول الحقول المطلوبة عند ملؤها', () => {
      const obj = { name: 'Test', email: 'test@example.com' };
      const result = SecurityValidator.validateRequired(obj, ['name', 'email']);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('يجب التحقق من طول النص', () => {
      const result = SecurityValidator.validateStringLength('test', 1, 10);
      expect(result.valid).toBe(true);
    });

    it('يجب رفض النصوص القصيرة جداً', () => {
      const result = SecurityValidator.validateStringLength('', 5, 100);
      expect(result.valid).toBe(false);
    });

    it('يجب رفض النصوص الطويلة جداً', () => {
      const longString = 'a'.repeat(1000);
      const result = SecurityValidator.validateStringLength(longString, 1, 100);
      expect(result.valid).toBe(false);
    });

    it('يجب التحقق من صيغة البريد الإلكتروني', () => {
      const validEmail = SecurityValidator.validateEmail('test@example.com');
      expect(validEmail.valid).toBe(true);

      const invalidEmail = SecurityValidator.validateEmail('not-an-email');
      expect(invalidEmail.valid).toBe(false);
    });

    it('يجب التحقق من قوة كلمة المرور', () => {
      const weakPassword = SecurityValidator.validatePassword('weak');
      expect(weakPassword.valid).toBe(false);
      expect(weakPassword.errors.length).toBeGreaterThan(0);

      const strongPassword = SecurityValidator.validatePassword('StrongPass123');
      expect(strongPassword.valid).toBe(true);
      expect(strongPassword.errors.length).toBe(0);
    });

    it('يجب التحقق من وجود حرف كبير في كلمة المرور', () => {
      const result = SecurityValidator.validatePassword('lowercase123');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('حرف كبير'))).toBe(true);
    });

    it('يجب التحقق من وجود رقم في كلمة المرور', () => {
      const result = SecurityValidator.validatePassword('NoNumbers');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('رقم'))).toBe(true);
    });
  });
});
