using System.Reflection;
using Xunit;

namespace VietAnExpress.Architecture.Tests;

/// <summary>
/// Chặn vi phạm kiến trúc modular monolith ngay khi chạy test (CI), không đợi review code:
/// 1. Module chỉ tham chiếu SharedKernel + Contracts của module khác.
/// 2. Trong project module, chỉ class đăng ký DI (*Module) được public.
/// </summary>
public class ModuleBoundaryTests
{
    private static readonly string[] Modules = ["Identity", "Customers", "Shipments"];

    private static Assembly Load(string name) => Assembly.Load(new AssemblyName(name));

    public static TheoryData<string> ModuleNames => [.. Modules];

    [Theory]
    [MemberData(nameof(ModuleNames))]
    public void Module_khong_tham_chieu_project_chinh_cua_module_khac(string module)
    {
        var references = Load($"VietAnExpress.{module}").GetReferencedAssemblies().Select(a => a.Name!).ToList();

        var forbidden = Modules.Where(m => m != module).Select(m => $"VietAnExpress.{m}");
        Assert.Empty(references.Intersect(forbidden));
    }

    [Theory]
    [MemberData(nameof(ModuleNames))]
    public void Contracts_chi_tham_chieu_SharedKernel(string module)
    {
        var internalReferences = Load($"VietAnExpress.{module}.Contracts").GetReferencedAssemblies()
            .Select(a => a.Name!)
            .Where(n => n.StartsWith("VietAnExpress.", StringComparison.Ordinal));

        Assert.All(internalReferences, n => Assert.Equal("VietAnExpress.SharedKernel", n));
    }

    [Theory]
    [MemberData(nameof(ModuleNames))]
    public void Module_chi_public_lop_dang_ky_DI(string module)
    {
        var publicTypes = Load($"VietAnExpress.{module}").GetExportedTypes().Select(t => t.FullName).ToList();

        Assert.Equal([$"VietAnExpress.{module}.{module}Module"], publicTypes);
    }
}
