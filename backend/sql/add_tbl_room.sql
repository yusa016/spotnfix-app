-- Run in phpMyAdmin if spotn_fix already exists without the 3NF tbl_room table
USE `spotn_fix`;

CREATE TABLE IF NOT EXISTS `tbl_floors` (
  `floor_id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `floor_level` tinyint unsigned NOT NULL,
  `floor_name` varchar(20) NOT NULL,
  PRIMARY KEY (`floor_id`),
  UNIQUE KEY `floor_level` (`floor_level`),
  UNIQUE KEY `floor_name` (`floor_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `tbl_floors` (`floor_level`, `floor_name`) VALUES
(1, '1st Floor'), (2, '2nd Floor'), (3, '3rd Floor'), (4, '4th Floor'),
(5, '5th Floor'), (6, '6th Floor'), (7, '7th Floor'), (8, '8th Floor');

CREATE TABLE IF NOT EXISTS `tbl_room` (
  `room_number` varchar(20) NOT NULL,
  `floor_id` tinyint unsigned NOT NULL,
  `side` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`room_number`),
  KEY `floor_id` (`floor_id`),
  CONSTRAINT `tbl_room_ibfk_1` FOREIGN KEY (`floor_id`) REFERENCES `tbl_floors` (`floor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `tbl_room` (`room_number`, `floor_id`)
SELECT '810', floor_id FROM tbl_floors WHERE floor_level = 8
UNION ALL SELECT '806', floor_id FROM tbl_floors WHERE floor_level = 8
UNION ALL SELECT '823', floor_id FROM tbl_floors WHERE floor_level = 8
UNION ALL SELECT '701', floor_id FROM tbl_floors WHERE floor_level = 7
UNION ALL SELECT '606', floor_id FROM tbl_floors WHERE floor_level = 6
UNION ALL SELECT '503', floor_id FROM tbl_floors WHERE floor_level = 5
UNION ALL SELECT '501', floor_id FROM tbl_floors WHERE floor_level = 5
UNION ALL SELECT '402', floor_id FROM tbl_floors WHERE floor_level = 4
UNION ALL SELECT '403', floor_id FROM tbl_floors WHERE floor_level = 4
UNION ALL SELECT '305', floor_id FROM tbl_floors WHERE floor_level = 3
UNION ALL SELECT '216', floor_id FROM tbl_floors WHERE floor_level = 2
UNION ALL SELECT '209', floor_id FROM tbl_floors WHERE floor_level = 2;
