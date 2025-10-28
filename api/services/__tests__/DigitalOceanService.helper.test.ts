/**
 * Unit tests for DigitalOceanService helper methods
 * Tests formatAppName, getAppCategory, and getAppDescription
 */

import { describe, it, expect } from 'vitest';
import { digitalOceanService } from '../DigitalOceanService.js';

describe('DigitalOceanService Helper Methods', () => {
  describe('formatAppName', () => {
    it('should format simple slug to capitalized name', () => {
      // Access private method through any cast for testing
      const service = digitalOceanService as any;
      
      expect(service.formatAppName('wordpress')).toBe('Wordpress');
      expect(service.formatAppName('docker')).toBe('Docker');
      expect(service.formatAppName('nginx')).toBe('Nginx');
    });

    it('should format slug with version numbers', () => {
      const service = digitalOceanService as any;
      
      expect(service.formatAppName('wordpress-20-04')).toBe('Wordpress 20 04');
      expect(service.formatAppName('mongodb-7-0')).toBe('Mongodb 7 0');
      expect(service.formatAppName('nodejs-18-04')).toBe('Nodejs 18 04');
    });

    it('should format multi-word slugs', () => {
      const service = digitalOceanService as any;
      
      expect(service.formatAppName('ruby-on-rails')).toBe('Ruby On Rails');
      expect(service.formatAppName('mysql-server')).toBe('Mysql Server');
    });

    it('should handle slugs with mixed words and numbers', () => {
      const service = digitalOceanService as any;
      
      expect(service.formatAppName('ubuntu-22-04-lts')).toBe('Ubuntu 22 04 Lts');
      expect(service.formatAppName('php-8-1-apache')).toBe('Php 8 1 Apache');
    });

    it('should handle single character words', () => {
      const service = digitalOceanService as any;
      
      expect(service.formatAppName('k3s')).toBe('K3s');
      expect(service.formatAppName('a-b-c')).toBe('A B C');
    });
  });

  describe('getAppCategory', () => {
    it('should categorize database apps', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppCategory('mysql-8-0')).toBe('Databases');
      expect(service.getAppCategory('postgresql-14')).toBe('Databases');
      expect(service.getAppCategory('mongodb-7-0')).toBe('Databases');
      expect(service.getAppCategory('redis-7')).toBe('Databases');
      expect(service.getAppCategory('mariadb-10-6')).toBe('Databases');
    });

    it('should categorize CMS apps', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppCategory('wordpress-20-04')).toBe('CMS');
      expect(service.getAppCategory('drupal-9')).toBe('CMS');
      expect(service.getAppCategory('joomla-4')).toBe('CMS');
      expect(service.getAppCategory('ghost-5')).toBe('CMS');
    });

    it('should categorize container apps', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppCategory('docker-20-04')).toBe('Containers');
      expect(service.getAppCategory('kubernetes-1-25')).toBe('Containers');
      expect(service.getAppCategory('k3s-latest')).toBe('Containers');
    });

    it('should categorize development apps', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppCategory('nodejs-18-04')).toBe('Development');
      expect(service.getAppCategory('ruby-3-1')).toBe('Development');
      expect(service.getAppCategory('python-3-10')).toBe('Development');
      expect(service.getAppCategory('php-8-1')).toBe('Development');
      expect(service.getAppCategory('django-4')).toBe('Development');
      expect(service.getAppCategory('rails-7')).toBe('Development');
    });

    it('should categorize monitoring apps', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppCategory('grafana-9')).toBe('Monitoring');
      expect(service.getAppCategory('prometheus-2')).toBe('Monitoring');
      expect(service.getAppCategory('elk-stack')).toBe('Monitoring');
      expect(service.getAppCategory('monitoring-tools')).toBe('Monitoring');
    });

    it('should categorize web server apps', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppCategory('nginx-1-22')).toBe('Web Servers');
      expect(service.getAppCategory('apache-2-4')).toBe('Web Servers');
      expect(service.getAppCategory('caddy-2')).toBe('Web Servers');
    });

    it('should return Other for unknown apps', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppCategory('unknown-app')).toBe('Other');
      expect(service.getAppCategory('custom-stack')).toBe('Other');
      expect(service.getAppCategory('random-123')).toBe('Other');
    });

    it('should be case insensitive', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppCategory('MYSQL-8-0')).toBe('Databases');
      expect(service.getAppCategory('WordPress-20-04')).toBe('CMS');
      expect(service.getAppCategory('DOCKER-20-04')).toBe('Containers');
    });
  });

  describe('getAppDescription', () => {
    it('should return description for known apps', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppDescription('wordpress')).toBe('Popular open-source CMS for websites and blogs');
      expect(service.getAppDescription('docker')).toBe('Container platform for building and deploying applications');
      expect(service.getAppDescription('mongodb')).toBe('NoSQL document database');
      expect(service.getAppDescription('mysql')).toBe('Open-source relational database');
      expect(service.getAppDescription('nodejs')).toBe('JavaScript runtime for server-side applications');
    });

    it('should return description for stack apps', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppDescription('lemp')).toBe('Linux, Nginx, MySQL, PHP stack');
      expect(service.getAppDescription('lamp')).toBe('Linux, Apache, MySQL, PHP stack');
    });

    it('should return description for web servers', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppDescription('nginx')).toBe('High-performance web server and reverse proxy');
      expect(service.getAppDescription('apache')).toBe('Popular open-source web server');
      expect(service.getAppDescription('caddy')).toBe('Modern web server with automatic HTTPS');
    });

    it('should return description for databases', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppDescription('redis')).toBe('In-memory data structure store');
      expect(service.getAppDescription('postgres')).toBe('Advanced open-source relational database');
      expect(service.getAppDescription('postgresql')).toBe('Advanced open-source relational database');
      expect(service.getAppDescription('mariadb')).toBe('Open-source relational database (MySQL fork)');
    });

    it('should return description for CMS platforms', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppDescription('drupal')).toBe('Open-source CMS and web application framework');
      expect(service.getAppDescription('joomla')).toBe('Open-source CMS for publishing web content');
      expect(service.getAppDescription('ghost')).toBe('Modern open-source publishing platform');
    });

    it('should return description for container platforms', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppDescription('kubernetes')).toBe('Container orchestration platform');
      expect(service.getAppDescription('k3s')).toBe('Lightweight Kubernetes distribution');
    });

    it('should return description for monitoring tools', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppDescription('grafana')).toBe('Analytics and monitoring platform');
      expect(service.getAppDescription('prometheus')).toBe('Monitoring and alerting toolkit');
      expect(service.getAppDescription('elk')).toBe('Elasticsearch, Logstash, and Kibana stack');
    });

    it('should return description for development frameworks', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppDescription('python')).toBe('Python programming language runtime');
      expect(service.getAppDescription('ruby')).toBe('Ruby programming language runtime');
      expect(service.getAppDescription('php')).toBe('PHP programming language runtime');
      expect(service.getAppDescription('django')).toBe('High-level Python web framework');
      expect(service.getAppDescription('rails')).toBe('Ruby on Rails web application framework');
    });

    it('should return default description for unknown apps', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppDescription('unknown-app')).toBe('Pre-configured marketplace application');
      expect(service.getAppDescription('custom-stack')).toBe('Pre-configured marketplace application');
      expect(service.getAppDescription('random-123')).toBe('Pre-configured marketplace application');
    });

    it('should extract base slug from versioned apps', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppDescription('wordpress-20-04')).toBe('Popular open-source CMS for websites and blogs');
      expect(service.getAppDescription('docker-20-04')).toBe('Container platform for building and deploying applications');
      expect(service.getAppDescription('mongodb-7-0')).toBe('NoSQL document database');
      expect(service.getAppDescription('nodejs-18-04')).toBe('JavaScript runtime for server-side applications');
    });

    it('should be case insensitive for base slug extraction', () => {
      const service = digitalOceanService as any;
      
      expect(service.getAppDescription('WordPress-20-04')).toBe('Popular open-source CMS for websites and blogs');
      expect(service.getAppDescription('DOCKER-20-04')).toBe('Container platform for building and deploying applications');
    });
  });
});
