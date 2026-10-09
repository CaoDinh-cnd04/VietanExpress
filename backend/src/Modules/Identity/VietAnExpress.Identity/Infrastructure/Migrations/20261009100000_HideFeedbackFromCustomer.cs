using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VietAnExpress.Identity.Infrastructure.Migrations
{
    internal partial class HideFeedbackFromCustomer : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Khach_Da_An",
                schema: "dbo",
                table: "GopY",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Khach_Da_An",
                schema: "dbo",
                table: "GopY");
        }
    }
}
