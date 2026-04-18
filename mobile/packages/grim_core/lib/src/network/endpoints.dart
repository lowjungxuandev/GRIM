abstract final class GrimEndpoints {
  static const String baseUrl = 'http://localhost:3001';

  static const String import = '$baseUrl/api/v1/import';
  static const String health = '$baseUrl/health';

  static String export({int page = 1, int limit = 20}) {
    return '$baseUrl/api/v1/export?page=$page&limit=$limit';
  }
}
