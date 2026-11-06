const { DataTypes } = require("sequelize");

// Quên mật khẩu: lưu HASH (sha256) của token đặt lại — không lưu token gốc —
// cùng hạn dùng; password_changed_at để vô hiệu các JWT phát hành trước lần
// đổi/đặt lại mật khẩu (middlewares/auth.js).
//
// Viết để chạy lại được nếu MariaDB auto-commit DDL làm gián đoạn giữa chừng.

const COLUMNS = {
  password_reset_token_hash: { type: DataTypes.STRING(64), allowNull: true },
  password_reset_expires_at: { type: DataTypes.DATE, allowNull: true },
  password_changed_at: { type: DataTypes.DATE, allowNull: true },
};

const INDEX_NAME = "uq_users_password_reset_token_hash";

module.exports = {
  up: async ({ context: queryInterface }) => {
    const existing = await queryInterface.describeTable("users");
    for (const [name, definition] of Object.entries(COLUMNS)) {
      if (!existing[name]) {
        await queryInterface.addColumn("users", name, definition);
      }
    }

    const indexes = await queryInterface.showIndex("users");
    if (!indexes.some((index) => index.name === INDEX_NAME)) {
      await queryInterface.addIndex("users", ["password_reset_token_hash"], {
        name: INDEX_NAME,
        unique: true,
      });
    }
  },

  down: async ({ context: queryInterface }) => {
    const indexes = await queryInterface.showIndex("users");
    if (indexes.some((index) => index.name === INDEX_NAME)) {
      await queryInterface.removeIndex("users", INDEX_NAME);
    }

    const existing = await queryInterface.describeTable("users");
    for (const name of Object.keys(COLUMNS)) {
      if (existing[name]) {
        await queryInterface.removeColumn("users", name);
      }
    }
  },
};
