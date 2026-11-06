const { DataTypes } = require("sequelize");

// Nhắc chuyến theo từng VÉ thay vì theo chuyến: trước đây job đánh dấu
// trips.reminder_sent_at ngay lượt đầu chuyến lọt vào khung 30 phút, nên vé
// đặt sau mốc đó (khách đặt sát giờ) không bao giờ được nhắc.
// tickets.reminder_sent_at = lúc đã gửi (hoặc đã giành quyền gửi) mail nhắc cho vé.
//
// Viết để chạy lại được nếu MariaDB auto-commit DDL làm gián đoạn giữa chừng.

module.exports = {
  up: async ({ context: queryInterface }) => {
    const existing = await queryInterface.describeTable("tickets");
    if (!existing.reminder_sent_at) {
      await queryInterface.addColumn("tickets", "reminder_sent_at", {
        type: DataTypes.DATE,
        allowNull: true,
      });
    }

    // Vé của chuyến đã được nhắc theo cách cũ coi như đã nhắc — tránh gửi lại lần hai.
    await queryInterface.sequelize.query(`
      UPDATE tickets t
      JOIN trips tr ON tr.id = t.trip_id
      SET t.reminder_sent_at = tr.reminder_sent_at
      WHERE t.reminder_sent_at IS NULL AND tr.reminder_sent_at IS NOT NULL
    `);
  },

  down: async ({ context: queryInterface }) => {
    const existing = await queryInterface.describeTable("tickets");
    if (existing.reminder_sent_at) {
      await queryInterface.removeColumn("tickets", "reminder_sent_at");
    }
  },
};
