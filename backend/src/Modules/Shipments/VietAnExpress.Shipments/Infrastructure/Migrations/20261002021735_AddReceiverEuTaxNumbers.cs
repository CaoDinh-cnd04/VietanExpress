using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VietAnExpress.Shipments.Infrastructure.Migrations
{
    /// <inheritdoc />
    internal partial class AddReceiverEuTaxNumbers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // MaVanDon được ExcludeFromMigrations: bổ sung tường minh 2 cột được yêu cầu.
            migrationBuilder.AddColumn<string>(
                name: "ConsigneeIossNo", schema: "dbo", table: "MaVanDon",
                type: "nvarchar(12)", maxLength: 12, nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "ConsigneeEoriNo", schema: "dbo", table: "MaVanDon",
                type: "nvarchar(17)", maxLength: 17, nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "ConsigneeIossNo", schema: "dbo", table: "MaVanDon");
            migrationBuilder.DropColumn(name: "ConsigneeEoriNo", schema: "dbo", table: "MaVanDon");
        }
    }
}
