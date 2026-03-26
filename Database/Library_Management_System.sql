--  First create the database
CREATE DATABASE library_management_system_learning;


--  Now create the Users table
USE library_management_system_learning;
CREATE TABLE users (                                                                                                                                                                         
      user_id INT IDENTITY(1,1) PRIMARY KEY,                                                                                                                                                   
      name VARCHAR(100) NOT NULL,                                                                                                                                                              
      email VARCHAR(255) NOT NULL UNIQUE,                                                                                                                                                      
      phone VARCHAR(20) NULL,                                                                                                                                                                  
      password_hash VARCHAR(255) NOT NULL,                                                                                                                                                     
      role VARCHAR(20) NOT NULL                                                                                                                                                                
          CHECK (role IN ('ADMIN', 'USER')),                                                                                                                                                   
      refresh_token VARCHAR(500) NULL,                                                                                                                                                         
      is_active BIT NOT NULL DEFAULT 1,                                                                                                                                                        
      created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),                                                                                                                                     
      updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()                                                                                                                                      
  );                                                                                                                                                             


-- Now create the Categories table
CREATE TABLE categories (
  category_id INT IDENTITY(1,1) PRIMARY KEY,
  category_name VARCHAR(150) NOT NULL UNIQUE,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description VARCHAR(MAX) NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);


-- Now create the Books table
CREATE TABLE books (
  book_id INT IDENTITY(1,1) PRIMARY KEY,
  category_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  isbn VARCHAR(20) NOT NULL UNIQUE,
  publisher VARCHAR(255) NULL,
  publication_year INT NULL,
  edition VARCHAR(100) NULL,
  language VARCHAR(100) NULL,
  description VARCHAR(MAX) NULL,
  cover_image_url VARCHAR(500) NULL,
  total_copies INT NOT NULL CHECK (total_copies >= 0),
  shelf_location VARCHAR(100) NULL,
  status VARCHAR(20) NOT NULL
      CHECK (status IN ('AVAILABLE', 'INACTIVE', 'ARCHIVED')),
  created_by INT NOT NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_books_categories
      FOREIGN KEY (category_id) REFERENCES categories(category_id),
  CONSTRAINT FK_books_users
      FOREIGN KEY (created_by) REFERENCES users(user_id)
);


-- Now create the Reservations table
CREATE TABLE reservations (
  reservation_id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  reservation_code VARCHAR(50) NOT NULL UNIQUE,
  reserved_at DATETIME2 NOT NULL
      CHECK (expires_at > reserved_at),
  expires_at DATETIME2 NOT NULL,
  status VARCHAR(20) NOT NULL
      CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED')),
  created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_reservations_users
      FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT FK_reservations_books
      FOREIGN KEY (book_id) REFERENCES books(book_id)
);
