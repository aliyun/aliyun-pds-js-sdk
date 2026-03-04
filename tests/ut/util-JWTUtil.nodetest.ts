import {describe, expect, it} from 'vitest'
import {sign} from '../../lib/utils/JWTUtil'
import {generateKeyPairSync} from 'crypto'

describe('JWTUtil', () => {
  // 生成测试用的RSA密钥对
  const {privateKey} = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  })

  describe('sign', () => {
    it('should sign content with default RS256 algorithm', () => {
      const content = {
        sub: '1234567890',
        name: 'Test User',
        iat: 1516239022,
      }

      const token = sign(content, privateKey)

      // JWT应该有3个部分，用.分隔
      const parts = token.split('.')
      expect(parts).toHaveLength(3)

      // 验证header部分
      const header = JSON.parse(
        Buffer.from(
          parts[0] +
            '='
              .repeat((4 - (parts[0].length % 4)) % 4)
              .replace(/-/g, '+')
              .replace(/_/g, '/'),
          'base64',
        ).toString(),
      )
      expect(header.alg).toBe('RS256')
      expect(header.typ).toBe('JWT')

      // 验证payload部分
      const payload = JSON.parse(
        Buffer.from(
          parts[1] +
            '='
              .repeat((4 - (parts[1].length % 4)) % 4)
              .replace(/-/g, '+')
              .replace(/_/g, '/'),
          'base64',
        ).toString(),
      )
      expect(payload.sub).toBe('1234567890')
      expect(payload.name).toBe('Test User')
      expect(payload.iat).toBe(1516239022)

      // 验证signature部分存在且不为空
      expect(parts[2]).toBeTruthy()
      expect(parts[2].length).toBeGreaterThan(0)
    })

    it('should sign content with explicit RS256 algorithm', () => {
      const content = {test: 'data'}
      const token = sign(content, privateKey, 'RS256')

      const parts = token.split('.')
      expect(parts).toHaveLength(3)
    })

    it('should throw error for unsupported algorithm', () => {
      const content = {test: 'data'}

      expect(() => {
        sign(content, privateKey, 'HS256')
      }).toThrow('Unsupported algorithm:HS256')
    })

    it('should throw error for invalid algorithm', () => {
      const content = {test: 'data'}

      expect(() => {
        sign(content, privateKey, 'INVALID')
      }).toThrow('Unsupported algorithm:INVALID')
    })

    it('should produce base64url encoded parts without padding', () => {
      const content = {test: 'data'}
      const token = sign(content, privateKey)

      const parts = token.split('.')

      // base64url不应该包含+, /, =
      parts.forEach(part => {
        expect(part).not.toContain('+')
        expect(part).not.toContain('/')
        expect(part).not.toContain('=')
      })
    })

    it('should handle complex content objects', () => {
      const content = {
        sub: '1234567890',
        name: 'Test User',
        admin: true,
        iat: 1516239022,
        exp: 1516242622,
        roles: ['user', 'admin'],
        metadata: {
          key1: 'value1',
          key2: 'value2',
        },
      }

      const token = sign(content, privateKey)

      const parts = token.split('.')
      expect(parts).toHaveLength(3)

      const payload = JSON.parse(
        Buffer.from(
          parts[1] +
            '='
              .repeat((4 - (parts[1].length % 4)) % 4)
              .replace(/-/g, '+')
              .replace(/_/g, '/'),
          'base64',
        ).toString(),
      )
      expect(payload).toEqual(content)
    })

    it('should handle empty content object', () => {
      const content = {}
      const token = sign(content, privateKey)

      const parts = token.split('.')
      expect(parts).toHaveLength(3)
    })

    it('should produce consistent token for same content', () => {
      const content = {test: 'data'}

      const token1 = sign(content, privateKey)
      const token2 = sign(content, privateKey)

      // header和payload部分应该相同
      const parts1 = token1.split('.')
      const parts2 = token2.split('.')

      expect(parts1[0]).toBe(parts2[0]) // header相同
      expect(parts1[1]).toBe(parts2[1]) // payload相同
      expect(parts1[2]).toBe(parts2[2]) // 同样的密钥和内容，签名也应该相同
    })

    it('should handle special characters in content', () => {
      const content = {
        message: 'Hello, 世界! 🌍',
        special: '!@#$%^&*()',
      }

      const token = sign(content, privateKey)

      const parts = token.split('.')
      const payload = JSON.parse(
        Buffer.from(
          parts[1] +
            '='
              .repeat((4 - (parts[1].length % 4)) % 4)
              .replace(/-/g, '+')
              .replace(/_/g, '/'),
          'base64',
        ).toString(),
      )

      expect(payload.message).toBe('Hello, 世界! 🌍')
      expect(payload.special).toBe('!@#$%^&*()')
    })

    it('should handle numeric and boolean values', () => {
      const content = {
        number: 12345,
        float: 123.45,
        boolean: true,
        nullValue: null,
      }

      const token = sign(content, privateKey)

      const parts = token.split('.')
      const payload = JSON.parse(
        Buffer.from(
          parts[1] +
            '='
              .repeat((4 - (parts[1].length % 4)) % 4)
              .replace(/-/g, '+')
              .replace(/_/g, '/'),
          'base64',
        ).toString(),
      )

      expect(payload.number).toBe(12345)
      expect(payload.float).toBe(123.45)
      expect(payload.boolean).toBe(true)
      expect(payload.nullValue).toBeNull()
    })
  })
})
