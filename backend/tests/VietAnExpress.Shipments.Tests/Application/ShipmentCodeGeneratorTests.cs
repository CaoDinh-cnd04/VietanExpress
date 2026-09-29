using Microsoft.Extensions.Configuration;
using VietAnExpress.Shipments.Infrastructure;
using Xunit;

namespace VietAnExpress.Shipments.Tests.Application;

[Collection(SqlServerCollection.Name)]
public class ShipmentCodeGeneratorTests(SqlServerFixture sql)
{
    [Fact]
    public async Task Cap_ma_tang_dan_tu_sequence_kem_tien_to()
    {
        SqlServerFixture.SkipIfUnavailable();
        await using var db = sql.CreateDb();
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Shipments:CodePrefix"] = "VA" }).Build();
        var generator = new ShipmentCodeGenerator(db, config);

        var first = await generator.NextAsync(TestContext.Current.CancellationToken);
        var second = await generator.NextAsync(TestContext.Current.CancellationToken);

        Assert.Matches("^VA\\d{8}$", first);
        Assert.Equal(long.Parse(first[2..]) + 1, long.Parse(second[2..]));
        Assert.True(long.Parse(first[2..]) >= ShipmentCodeGenerator.FirstNumber);
    }
}
