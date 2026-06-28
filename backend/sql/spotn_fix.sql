-- SpotN'Fix database schema (MariaDB / MySQL / TiDB Cloud)
--
-- NORMALIZATION: Third Normal Form (3NF)
--   1NF: Atomic columns, no repeating groups
--   2NF: No partial key dependencies (all non-keys depend on full PK)
--   3NF: No transitive dependencies — lookup tables for floors, facility types,
--        and issue types; reports/facilities reference IDs not duplicated labels
--
-- PRIMARY KEYS (10 tables)
--   tbl_users.user_id
--   tbl_floors.floor_id
--   tbl_facility_types.facility_type_id
--   tbl_issue_types.issue_type_id
--   tbl_room.room_number
--   tbl_facilities.facility_id
--   tbl_issue_reports.report_id
--   tbl_maintenance_tasks.task_id
--   tbl_activity_logs.log_id
--   tbl_contact_messages.contact_id
--
-- FOREIGN KEYS (9 relationships)
--   tbl_room.floor_id                    -> tbl_floors.floor_id
--   tbl_facilities.facility_type_id      -> tbl_facility_types.facility_type_id
--   tbl_facilities.floor_id              -> tbl_floors.floor_id
--   tbl_issue_reports.facility_id        -> tbl_facilities.facility_id
--   tbl_issue_reports.user_id            -> tbl_users.user_id
--   tbl_issue_reports.issue_type_id      -> tbl_issue_types.issue_type_id
--   tbl_maintenance_tasks.report_id      -> tbl_issue_reports.report_id
--   tbl_maintenance_tasks.assigned_to    -> tbl_users.user_id
--   tbl_activity_logs.user_id            -> tbl_users.user_id
--
-- See DATABASE_SCHEMA.md for full documentation and ER diagram.
CREATE DATABASE IF NOT EXISTS `spotn_fix`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE `spotn_fix`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `tbl_activity_logs`;
DROP TABLE IF EXISTS `tbl_maintenance_tasks`;
DROP TABLE IF EXISTS `tbl_issue_reports`;
DROP TABLE IF EXISTS `tbl_contact_messages`;
DROP TABLE IF EXISTS `tbl_facilities`;
DROP TABLE IF EXISTS `tbl_room`;
DROP TABLE IF EXISTS `tbl_issue_types`;
DROP TABLE IF EXISTS `tbl_facility_types`;
DROP TABLE IF EXISTS `tbl_floors`;
DROP TABLE IF EXISTS `tbl_users`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `tbl_users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `id_number` bigint NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('student','faculty','admin') NOT NULL DEFAULT 'student',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `id_number` (`id_number`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tbl_floors` (
  `floor_id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `floor_level` tinyint unsigned NOT NULL,
  `floor_name` varchar(20) NOT NULL,
  PRIMARY KEY (`floor_id`),
  UNIQUE KEY `floor_level` (`floor_level`),
  UNIQUE KEY `floor_name` (`floor_name`),
  CONSTRAINT `chk_floors_level` CHECK (`floor_level` BETWEEN 1 AND 8)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `tbl_floors` (`floor_level`, `floor_name`) VALUES
(1, '1st Floor'),
(2, '2nd Floor'),
(3, '3rd Floor'),
(4, '4th Floor'),
(5, '5th Floor'),
(6, '6th Floor'),
(7, '7th Floor'),
(8, '8th Floor');

CREATE TABLE `tbl_facility_types` (
  `facility_type_id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `type_name` varchar(50) NOT NULL,
  PRIMARY KEY (`facility_type_id`),
  UNIQUE KEY `type_name` (`type_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `tbl_facility_types` (`type_name`) VALUES
('Equipment'),
('Furniture'),
('Television'),
('Computer'),
('Microscope'),
('Projector'),
('Lighting'),
('Printer'),
('Air Conditioner'),
('Audio'),
('Appliance'),
('Electronics'),
('Other');

CREATE TABLE `tbl_issue_types` (
  `issue_type_id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `type_name` varchar(100) NOT NULL,
  PRIMARY KEY (`issue_type_id`),
  UNIQUE KEY `type_name` (`type_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `tbl_issue_types` (`type_name`) VALUES
('Electrical'),
('Hardware'),
('Supplies'),
('Plumbing'),
('Malfunction'),
('Hardware Failure'),
('Leak'),
('Display Problem'),
('Optical Issue'),
('Electrical Issue'),
('Physical Damage'),
('System Crash'),
('Paper Jam'),
('Audio Static'),
('No Hot Water'),
('Display Freeze'),
('Other');

CREATE TABLE `tbl_room` (
  `room_number` varchar(20) NOT NULL,
  `floor_id` tinyint unsigned NOT NULL,
  `side` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`room_number`),
  KEY `floor_id` (`floor_id`),
  CONSTRAINT `tbl_room_ibfk_1` FOREIGN KEY (`floor_id`) REFERENCES `tbl_floors` (`floor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tbl_facilities` (
  `facility_id` int(11) NOT NULL AUTO_INCREMENT,
  `facility_name` varchar(100) NOT NULL,
  `facility_type_id` smallint unsigned NOT NULL,
  `floor_id` tinyint unsigned NOT NULL,
  `room_number` varchar(20) NOT NULL,
  `location_type` enum('room','area') NOT NULL DEFAULT 'room',
  `status` enum('Operational','Faulty','Under Maintenance') NOT NULL DEFAULT 'Operational',
  PRIMARY KEY (`facility_id`),
  KEY `facility_type_id` (`facility_type_id`),
  KEY `floor_id` (`floor_id`),
  CONSTRAINT `tbl_facilities_ibfk_1` FOREIGN KEY (`facility_type_id`) REFERENCES `tbl_facility_types` (`facility_type_id`),
  CONSTRAINT `tbl_facilities_ibfk_2` FOREIGN KEY (`floor_id`) REFERENCES `tbl_floors` (`floor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tbl_issue_reports` (
  `report_id` int(11) NOT NULL AUTO_INCREMENT,
  `facility_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `issue_type_id` smallint unsigned NOT NULL,
  `description` text NOT NULL,
  `photo_path` varchar(255) DEFAULT NULL,
  `report_date` datetime DEFAULT current_timestamp(),
  `status` enum('Pending','In Progress','Resolved') NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`report_id`),
  KEY `facility_id` (`facility_id`),
  KEY `user_id` (`user_id`),
  KEY `issue_type_id` (`issue_type_id`),
  CONSTRAINT `tbl_issue_reports_ibfk_1` FOREIGN KEY (`facility_id`) REFERENCES `tbl_facilities` (`facility_id`),
  CONSTRAINT `tbl_issue_reports_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`),
  CONSTRAINT `tbl_issue_reports_ibfk_3` FOREIGN KEY (`issue_type_id`) REFERENCES `tbl_issue_types` (`issue_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tbl_maintenance_tasks` (
  `task_id` int(11) NOT NULL AUTO_INCREMENT,
  `report_id` int(11) NOT NULL,
  `assigned_to` int(11) NOT NULL,
  `task_status` enum('Assigned','In Progress','Completed') NOT NULL DEFAULT 'Assigned',
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`task_id`),
  KEY `report_id` (`report_id`),
  KEY `assigned_to` (`assigned_to`),
  CONSTRAINT `tbl_maintenance_tasks_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `tbl_issue_reports` (`report_id`),
  CONSTRAINT `tbl_maintenance_tasks_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `tbl_users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tbl_activity_logs` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `action` varchar(255) NOT NULL,
  `table_name` varchar(50) NOT NULL,
  `record_id` int(11) NOT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `tbl_activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tbl_contact_messages` (
  `contact_id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `subject` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `status` enum('New','Read','Archived') NOT NULL DEFAULT 'New',
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`contact_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
