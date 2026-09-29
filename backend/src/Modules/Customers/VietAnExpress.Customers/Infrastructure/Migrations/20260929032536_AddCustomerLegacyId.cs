using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VietAnExpress.Customers.Infrastructure.Migrations
{
    /// <inheritdoc />
    internal partial class AddCustomerLegacyId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "LegacyId",
                schema: "customers",
                table: "Customers",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Customers_LegacyId",
                schema: "customers",
                table: "Customers",
                column: "LegacyId",
                unique: true,
                filter: "[LegacyId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Customers_LegacyId",
                schema: "customers",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "LegacyId",
                schema: "customers",
                table: "Customers");
        }
    }
}
