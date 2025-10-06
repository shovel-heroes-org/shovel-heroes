# Product Overview

## Product Description
Shovel Heroes (鏟子英雄) is a disaster relief coordination platform designed to manage volunteer efforts, supply donations, and area assignments during disaster recovery operations.

**Project**: Shovel Heroes
**Version**: 0.1.0
**Type**: Full-Stack Monorepo (Frontend + Backend + Shared Types)

## Core Features
- **Disaster Area Management**: Create, track, and manage affected disaster zones with grid-based area division
- **Volunteer Coordination**: Register volunteers, track registrations, and manage volunteer assignments to specific grid areas
- **Supply Donation Tracking**: Record and manage supply donations for disaster relief efforts
- **Grid-Based Area System**: Divide disaster areas into manageable grids for efficient volunteer deployment
- **Grid Discussions**: Enable communication and coordination within specific grid areas
- **Announcements**: Broadcast important updates to volunteers and coordinators
- **CSV Import/Export**: Bulk data operations for legacy system migration and reporting
- **User Management**: Track users, volunteers, and their roles with LINE authentication integration
- **Audit Logging**: Comprehensive request/response tracking for accountability and debugging

## Target Use Case
Emergency response coordination for natural disasters (floods, earthquakes, typhoons) requiring organized volunteer efforts and supply distribution across affected geographic areas.

## Key Value Proposition
- **Geographic Coordination**: Grid-based system enables precise volunteer deployment to specific areas
- **Dual Backend Support**: Flexible architecture supporting both Base44 SDK and self-hosted REST backend
- **Type Safety**: OpenAPI-first design with generated TypeScript types shared across frontend and backend
- **Rapid Deployment**: Docker-based infrastructure for quick setup during emergency situations
- **Data Migration**: CSV import/export for integration with existing disaster management systems

## Target Users
- **Disaster Coordinators**: Manage overall relief operations, create disaster areas, and assign resources
- **Volunteers**: Register for shifts, view assignments, and communicate with teams
- **Supply Managers**: Track donations and distribution across affected areas
- **System Administrators**: Monitor operations through audit logs and health checks

## Success Metrics
- Volunteer registration and deployment time < 5 minutes
- Grid assignment coverage rate > 90%
- Supply donation tracking accuracy > 95%
- System availability during disaster events > 99%
- CSV import success rate > 95%

## Technical Advantages
- **OpenAPI-First Development**: Single source of truth for API contracts with automated type generation
- **Monorepo Architecture**: Shared types between frontend and backend eliminate type mismatches
- **Hot Reload Development**: Fast iteration with Vite (frontend) and tsx watch (backend)
- **Database Health Monitoring**: Automated health checks and connection management
- **Flexible Authentication**: LINE login integration for rapid volunteer onboarding
