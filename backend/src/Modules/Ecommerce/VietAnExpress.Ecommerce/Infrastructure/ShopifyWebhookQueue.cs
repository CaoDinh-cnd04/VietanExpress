using System.Threading.Channels;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VietAnExpress.Ecommerce.Application;

namespace VietAnExpress.Ecommerce.Infrastructure;

/// <summary>
/// Webhook Shopify đã qua kiểm chữ ký, chờ xử lý nền. Shopify bắt phải trả 200 trong 5 giây — xử lý (đọc / ghi DB ở xa)
/// có thể lâu hơn, nên controller chỉ kiểm HMAC, xếp hàng rồi trả 200 ngay.
/// Hàng đợi trong bộ nhớ: mất nếu máy chủ khởi động lại đúng lúc đó (vài giây) — Shopify không gửi lại webhook đã nhận 200.
/// </summary>
internal sealed class ShopifyWebhookQueue
{
    private readonly Channel<ReceiveShopifyWebhookCommand> _channel =
        Channel.CreateUnbounded<ReceiveShopifyWebhookCommand>(new UnboundedChannelOptions { SingleReader = true });

    public void Enqueue(ReceiveShopifyWebhookCommand command) => _channel.Writer.TryWrite(command);

    public ChannelReader<ReceiveShopifyWebhookCommand> Reader => _channel.Reader;
}

/// <summary>Xử lý lần lượt webhook trong <see cref="ShopifyWebhookQueue"/> (mỗi webhook 1 scope DI riêng).</summary>
internal sealed class ShopifyWebhookWorker(ShopifyWebhookQueue queue, IServiceScopeFactory scopes, ILogger<ShopifyWebhookWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var command in queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var outcome = await scope.ServiceProvider.GetRequiredService<ISender>().Send(command, stoppingToken);
                logger.LogInformation("Webhook Shopify {Topic} từ {Shop}: {Action} ({Affected})",
                    command.Topic, command.Shop, outcome.Action, outcome.Affected);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                logger.LogError(e, "Lỗi xử lý webhook Shopify {Topic} từ {Shop}", command.Topic, command.Shop);
            }
        }
    }
}
