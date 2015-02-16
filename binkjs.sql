-- phpMyAdmin SQL Dump
-- version 4.0.10deb1
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Feb 16, 2015 at 04:22 PM
-- Server version: 5.5.41-0ubuntu0.14.04.1
-- PHP Version: 5.5.9-1ubuntu4.5

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `binkjs`
--
CREATE DATABASE IF NOT EXISTS `binkjs` DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci;
USE `binkjs`;

-- --------------------------------------------------------

--
-- Table structure for table `bands`
--

DROP TABLE IF EXISTS `bands`;
CREATE TABLE IF NOT EXISTS `bands` (
  `id` bigint(4) NOT NULL AUTO_INCREMENT,
  `name` varchar(30) COLLATE latin1_general_ci NOT NULL,
  `link` varchar(50) COLLATE latin1_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci AUTO_INCREMENT=58 ;

-- --------------------------------------------------------

--
-- Table structure for table `changelog`
--

DROP TABLE IF EXISTS `changelog`;
CREATE TABLE IF NOT EXISTS `changelog` (
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `change` varchar(50) COLLATE latin1_general_ci NOT NULL,
  `id` bigint(4) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci AUTO_INCREMENT=90 ;

-- --------------------------------------------------------

--
-- Table structure for table `instruments`
--

DROP TABLE IF EXISTS `instruments`;
CREATE TABLE IF NOT EXISTS `instruments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(30) COLLATE latin1_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci AUTO_INCREMENT=132 ;

-- --------------------------------------------------------

--
-- Table structure for table `jams`
--

DROP TABLE IF EXISTS `jams`;
CREATE TABLE IF NOT EXISTS `jams` (
  `id` bigint(5) NOT NULL AUTO_INCREMENT,
  `private` int(1) NOT NULL,
  `date` date DEFAULT NULL,
  `title` varchar(50) COLLATE latin1_general_ci NOT NULL,
  `notes` varchar(5000) COLLATE latin1_general_ci DEFAULT NULL,
  `locid` int(3) DEFAULT NULL,
  `bandid` bigint(4) DEFAULT NULL,
  `defpic` bigint(4) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci AUTO_INCREMENT=669 ;

-- --------------------------------------------------------

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
CREATE TABLE IF NOT EXISTS `locations` (
  `name` varchar(30) COLLATE latin1_general_ci NOT NULL,
  `id` int(3) NOT NULL AUTO_INCREMENT,
  `address` varchar(300) COLLATE latin1_general_ci DEFAULT NULL,
  `link` varchar(50) COLLATE latin1_general_ci DEFAULT NULL,
  `lat` varchar(20) COLLATE latin1_general_ci DEFAULT NULL,
  `lon` varchar(20) COLLATE latin1_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci AUTO_INCREMENT=147 ;

-- --------------------------------------------------------

--
-- Table structure for table `musicians`
--

DROP TABLE IF EXISTS `musicians`;
CREATE TABLE IF NOT EXISTS `musicians` (
  `id` bigint(4) NOT NULL AUTO_INCREMENT,
  `name` varchar(30) COLLATE latin1_general_ci NOT NULL,
  `link` varchar(50) COLLATE latin1_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci AUTO_INCREMENT=268 ;

-- --------------------------------------------------------

--
-- Table structure for table `musiciansoncollection`
--

DROP TABLE IF EXISTS `musiciansoncollection`;
CREATE TABLE IF NOT EXISTS `musiciansoncollection` (
  `musicianid` bigint(4) NOT NULL,
  `jamid` bigint(4) NOT NULL,
  `instrumentid` bigint(4) NOT NULL,
  KEY `musicianid` (`musicianid`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pictures`
--

DROP TABLE IF EXISTS `pictures`;
CREATE TABLE IF NOT EXISTS `pictures` (
  `id` bigint(4) NOT NULL AUTO_INCREMENT,
  `filename` varchar(100) COLLATE latin1_general_ci NOT NULL,
  `jamid` bigint(4) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci AUTO_INCREMENT=5663 ;

-- --------------------------------------------------------

--
-- Table structure for table `playlists`
--

DROP TABLE IF EXISTS `playlists`;
CREATE TABLE IF NOT EXISTS `playlists` (
  `id` varchar(32) NOT NULL,
  `trackid` int(10) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `productiononcollection`
--

DROP TABLE IF EXISTS `productiononcollection`;
CREATE TABLE IF NOT EXISTS `productiononcollection` (
  `jamid` bigint(4) NOT NULL,
  `staffid` bigint(4) NOT NULL,
  `roleid` bigint(4) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
CREATE TABLE IF NOT EXISTS `roles` (
  `id` bigint(4) NOT NULL AUTO_INCREMENT,
  `name` varchar(30) COLLATE latin1_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci AUTO_INCREMENT=47 ;

-- --------------------------------------------------------

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
CREATE TABLE IF NOT EXISTS `staff` (
  `id` bigint(4) NOT NULL AUTO_INCREMENT,
  `name` varchar(30) COLLATE latin1_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci AUTO_INCREMENT=52 ;

-- --------------------------------------------------------

--
-- Table structure for table `tokens`
--

DROP TABLE IF EXISTS `tokens`;
CREATE TABLE IF NOT EXISTS `tokens` (
  `ip` varchar(127) NOT NULL,
  `token` varchar(16) NOT NULL,
  `date` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tracks`
--

DROP TABLE IF EXISTS `tracks`;
CREATE TABLE IF NOT EXISTS `tracks` (
  `id` bigint(6) NOT NULL AUTO_INCREMENT,
  `jamid` bigint(5) NOT NULL,
  `num` int(3) NOT NULL,
  `title` varchar(50) COLLATE latin1_general_ci NOT NULL,
  `path` varchar(150) COLLATE latin1_general_ci DEFAULT NULL,
  `notes` varchar(1000) COLLATE latin1_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci AUTO_INCREMENT=7699 ;

-- --------------------------------------------------------

--
-- Table structure for table `types`
--

DROP TABLE IF EXISTS `types`;
CREATE TABLE IF NOT EXISTS `types` (
  `id` bigint(2) NOT NULL AUTO_INCREMENT,
  `name` varchar(30) COLLATE latin1_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci AUTO_INCREMENT=10 ;

-- --------------------------------------------------------

--
-- Table structure for table `upcoming`
--

DROP TABLE IF EXISTS `upcoming`;
CREATE TABLE IF NOT EXISTS `upcoming` (
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `change` varchar(30) COLLATE latin1_general_ci NOT NULL,
  `id` bigint(4) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci AUTO_INCREMENT=52 ;

-- --------------------------------------------------------

--
-- Table structure for table `video`
--

DROP TABLE IF EXISTS `video`;
CREATE TABLE IF NOT EXISTS `video` (
  `id` bigint(4) NOT NULL AUTO_INCREMENT,
  `title` varchar(50) COLLATE latin1_general_ci NOT NULL,
  `notes` varchar(500) COLLATE latin1_general_ci DEFAULT NULL,
  `num` int(3) NOT NULL,
  `path` varchar(50) COLLATE latin1_general_ci DEFAULT NULL,
  `jamid` bigint(4) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci AUTO_INCREMENT=405 ;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
