
import { AnalyzerService } from '../src/services/analyzer.service';
import { GitService } from '../src/services/git.service';
import { ASTService } from '../src/services/ast.service';

describe('AnalyzerService Integration', () => {
    let analyzer: AnalyzerService;

    beforeAll(() => {
        const gitService = new GitService();
        const astService = new ASTService();
        analyzer = new AnalyzerService(gitService, astService);
    });

    it('should analyze a commit and return impacted tests', async () => {
        const result = await analyzer.analyze('HEAD');
        expect(result).toHaveProperty('impacted_tests');
        expect(Array.isArray(result.impacted_tests)).toBe(true);
    });

    it('should handle invalid commits gracefully', async () => {
        await expect(analyzer.analyze('invalid-sha')).rejects.toThrow();
    });
});
